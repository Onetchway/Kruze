import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { PolicyService } from "../authz/policy.service";
import { AuthenticatedUser } from "../common/request-context";

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
}
