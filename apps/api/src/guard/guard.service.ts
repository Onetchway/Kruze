import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { PrismaService } from "../common/prisma/prisma.service";
import { PolicyService } from "../authz/policy.service";
import { AuthenticatedUser } from "../common/request-context";
import { UsersService } from "../identity/users.service";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class GuardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  async createForVendor(vendorOrgId: string, input: { fullName: string; phone: string }) {
    const existingCount = await this.prisma.guard.count();
    const globalGuardId = `KZ-GRD-${String(existingCount + 1).padStart(6, "0")}`;

    return this.prisma.guard.create({
      data: {
        globalGuardId,
        fullName: input.fullName,
        phone: input.phone,
        vendorRelationships: {
          create: { vendorOrgId, status: "ACTIVE", startsAt: new Date() },
        },
      },
      include: { vendorRelationships: true },
    });
  }

  listForVendor(vendorOrgId: string) {
    return this.prisma.guard.findMany({
      where: { vendorRelationships: { some: { vendorOrgId, status: "ACTIVE" } } },
      include: { vendorRelationships: { where: { vendorOrgId } } },
    });
  }

  async getForOrganisation(actor: AuthenticatedUser, guardId: string) {
    const guard = await this.prisma.guard.findUnique({
      where: { id: guardId },
      include: { vendorRelationships: true },
    });
    if (!guard) {
      throw new NotFoundException("Guard not found");
    }

    const isOwnVendor = guard.vendorRelationships.some(
      (rel) => rel.vendorOrgId === actor.organisationId && rel.status === "ACTIVE",
    );
    if (isOwnVendor) {
      return guard;
    }

    await this.policy.assertCorporateResourceEligibility(actor.organisationId, "GUARD", guardId);
    return guard;
  }

  /** Same claim-account pattern as DriverService.claimAccount — see there for the full rationale. */
  async claimAccount(input: { globalGuardId: string; phone: string; email: string; password: string }) {
    const guard = await this.prisma.guard.findUnique({
      where: { globalGuardId: input.globalGuardId },
      include: { vendorRelationships: { where: { status: "ACTIVE" } } },
    });
    if (!guard || guard.phone !== input.phone) {
      throw new BadRequestException("No matching guard record for that global guard ID and phone number");
    }
    if (guard.userId) {
      throw new ConflictException("This guard has already claimed a mobile login");
    }
    if (guard.vendorRelationships.length === 0) {
      throw new BadRequestException("This guard has no active vendor relationship yet");
    }
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const user = await this.users.createWithPassword({
      email: input.email,
      password: input.password,
      displayName: guard.fullName,
    });

    await this.prisma.$transaction([
      this.prisma.guard.update({ where: { id: guard.id }, data: { userId: user.id } }),
      ...guard.vendorRelationships.map((rel) =>
        this.prisma.organisationMembership.create({
          data: {
            userId: user.id,
            organisationId: rel.vendorOrgId,
            role: PlatformRole.GUARD,
            status: "ACTIVE",
          },
        }),
      ),
    ]);

    return this.auth.login({ email: input.email, password: input.password });
  }

  async getOwnProfile(actor: AuthenticatedUser) {
    const guard = await this.prisma.guard.findUnique({ where: { userId: actor.userId } });
    if (!guard) {
      throw new NotFoundException("No guard profile linked to this account");
    }
    return guard;
  }

  /** Today's trips assigned to this guard within their currently-active vendor org. */
  async myTripsToday(actor: AuthenticatedUser) {
    const guard = await this.getOwnProfile(actor);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    return this.prisma.tripAssignment.findMany({
      where: {
        guardId: guard.id,
        status: "ACTIVE",
        trip: {
          vendorOrgId: actor.organisationId,
          scheduledStartAt: { gte: startOfDay, lt: endOfDay },
        },
      },
      include: {
        trip: { include: { stops: { orderBy: { sequence: "asc" } }, employees: true } },
      },
      orderBy: { trip: { scheduledStartAt: "asc" } },
    });
  }
}
