import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { UsersService } from "../identity/users.service";
import { InvitePlatformUserDto } from "./dto/invite-platform-user.dto";

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

/**
 * Cross-tenant user management (spec §8) — unlike CorporateUserService,
 * this operates over ALL organisations, not the actor's own. Every
 * mutation here is a platform-admin action and is expected to be wrapped
 * in @Audited() by the controller.
 */
@Injectable()
export class PlatformUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async list(filter: { organisationId?: string; q?: string; status?: string }) {
    const memberships = await this.prisma.organisationMembership.findMany({
      where: {
        ...(filter.organisationId ? { organisationId: filter.organisationId } : {}),
        ...(filter.status ? { status: filter.status as never } : {}),
        ...(filter.q
          ? {
              user: {
                OR: [
                  { email: { contains: filter.q, mode: "insensitive" } },
                  { displayName: { contains: filter.q, mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, email: true, phone: true, displayName: true, status: true, mfaEnabled: true, createdAt: true } },
        organisation: { select: { id: true, globalOrgId: true, displayName: true } },
      },
    });
    return memberships;
  }

  /**
   * No email delivery is configured in this environment, so this creates
   * the account directly and returns a one-time temporary password for the
   * admin to share out of band — matches the pattern used for corporate
   * team invites (CorporateUserService).
   */
  async invite(input: InvitePlatformUserDto) {
    const org = await this.prisma.organisation.findUnique({ where: { id: input.organisationId } });
    if (!org) {
      throw new NotFoundException("Organisation not found");
    }
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      const existingMembership = await this.prisma.organisationMembership.findFirst({
        where: { userId: existing.id, organisationId: input.organisationId, role: input.role },
      });
      if (existingMembership) {
        throw new BadRequestException("This person already holds that role in this organisation");
      }
    }

    const tempPassword = generateTempPassword();
    const user =
      existing ?? (await this.users.createWithPassword({ email: input.email, displayName: input.displayName, password: tempPassword }));

    const membership = await this.prisma.organisationMembership.create({
      data: { userId: user.id, organisationId: input.organisationId, role: input.role, status: "ACTIVE" },
    });

    return { membership, temporaryPassword: existing ? null : tempPassword };
  }

  async setUserStatus(userId: string, status: "ACTIVE" | "DEACTIVATED") {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return this.prisma.user.update({ where: { id: userId }, data: { status } });
  }

  async changeMembershipRole(membershipId: string, role: string) {
    const membership = await this.prisma.organisationMembership.findUnique({ where: { id: membershipId } });
    if (!membership) {
      throw new NotFoundException("Membership not found");
    }
    return this.prisma.organisationMembership.update({ where: { id: membershipId }, data: { role: role as never } });
  }
}
