import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { PrismaService } from "../common/prisma/prisma.service";
import { PolicyService } from "../authz/policy.service";
import { AuthenticatedUser } from "../common/request-context";
import { UsersService } from "../identity/users.service";
import { AuthService } from "../auth/auth.service";

/**
 * Driver has exactly one global identity; vendor-specific status lives on
 * DriverVendorRelationship. Creating a driver always creates its first
 * vendor relationship in the same transaction — a driver identity with no
 * vendor relationship at all is not a meaningful state at this stage.
 */
@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  async createForVendor(
    vendorOrgId: string,
    input: { fullName: string; phone: string; licenceNumber?: string; employmentType?: string },
  ) {
    const existingCount = await this.prisma.driver.count();
    const globalDriverId = `KZ-DRV-${String(existingCount + 1).padStart(6, "0")}`;

    return this.prisma.driver.create({
      data: {
        globalDriverId,
        fullName: input.fullName,
        phone: input.phone,
        licenceNumber: input.licenceNumber,
        vendorRelationships: {
          create: {
            vendorOrgId,
            status: "ACTIVE",
            employmentType: input.employmentType,
            startsAt: new Date(),
          },
        },
      },
      include: { vendorRelationships: true },
    });
  }

  /** Only drivers with an active relationship to this vendor. */
  listForVendor(vendorOrgId: string) {
    return this.prisma.driver.findMany({
      where: {
        vendorRelationships: {
          some: { vendorOrgId, status: "ACTIVE" },
        },
      },
      include: {
        vendorRelationships: { where: { vendorOrgId } },
      },
    });
  }

  /**
   * Enforces relationship-based visibility: the caller's organisation must
   * either be one of the driver's active vendors, or hold an explicit
   * CorporateResourceEligibility for this driver.
   */
  async getForOrganisation(actor: AuthenticatedUser, driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { vendorRelationships: true },
    });
    if (!driver) {
      throw new NotFoundException("Driver not found");
    }

    const isOwnVendor = driver.vendorRelationships.some(
      (rel) => rel.vendorOrgId === actor.organisationId && rel.status === "ACTIVE",
    );
    if (isOwnVendor) {
      return driver;
    }

    await this.policy.assertCorporateResourceEligibility(actor.organisationId, "DRIVER", driverId);
    return driver;
  }

  /**
   * Lets a driver already onboarded by a vendor (via `create`) set up
   * mobile-app login themselves — the vendor identifies the person and
   * their phone number when creating the Driver record; the driver then
   * proves they are that person by re-entering the same phone number
   * plus their global driver ID, and picks their own password. Grants a
   * DRIVER-role membership on every vendor org the driver currently has
   * an ACTIVE relationship with, mirroring how login already supports a
   * user with multiple organisation memberships (see AuthService.login).
   */
  async claimAccount(input: { globalDriverId: string; phone: string; email: string; password: string }) {
    const driver = await this.prisma.driver.findUnique({
      where: { globalDriverId: input.globalDriverId },
      include: { vendorRelationships: { where: { status: "ACTIVE" } } },
    });
    if (!driver || driver.phone !== input.phone) {
      throw new BadRequestException("No matching driver record for that global driver ID and phone number");
    }
    if (driver.userId) {
      throw new ConflictException("This driver has already claimed a mobile login");
    }
    if (driver.vendorRelationships.length === 0) {
      throw new BadRequestException("This driver has no active vendor relationship yet");
    }
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const user = await this.users.createWithPassword({
      email: input.email,
      password: input.password,
      displayName: driver.fullName,
    });

    await this.prisma.$transaction([
      this.prisma.driver.update({ where: { id: driver.id }, data: { userId: user.id } }),
      ...driver.vendorRelationships.map((rel) =>
        this.prisma.organisationMembership.create({
          data: {
            userId: user.id,
            organisationId: rel.vendorOrgId,
            role: PlatformRole.DRIVER,
            status: "ACTIVE",
          },
        }),
      ),
    ]);

    return this.auth.login({ email: input.email, password: input.password });
  }

  async getOwnProfile(actor: AuthenticatedUser) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: actor.userId } });
    if (!driver) {
      throw new NotFoundException("No driver profile linked to this account");
    }
    return driver;
  }

  /** Today's trips assigned to this driver within their currently-active vendor org. */
  async myTripsToday(actor: AuthenticatedUser) {
    const driver = await this.getOwnProfile(actor);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    return this.prisma.tripAssignment.findMany({
      where: {
        driverId: driver.id,
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
