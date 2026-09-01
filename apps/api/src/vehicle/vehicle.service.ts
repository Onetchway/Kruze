import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { PolicyService } from "../authz/policy.service";
import { AuthenticatedUser } from "../common/request-context";

@Injectable()
export class VehicleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async createForVendor(
    vendorOrgId: string,
    input: {
      registrationNo: string;
      make?: string;
      model?: string;
      vehicleType?: string;
      capacity?: number;
      fuelType?: string;
      ownershipType?: string;
      isElectric?: boolean;
      batteryCapacityKwh?: number;
      rangeKm?: number;
    },
  ) {
    const existingCount = await this.prisma.vehicle.count();
    const globalVehicleId = `KZ-VEH-${String(existingCount + 1).padStart(6, "0")}`;

    return this.prisma.vehicle.create({
      data: {
        globalVehicleId,
        registrationNo: input.registrationNo,
        make: input.make,
        model: input.model,
        vehicleType: input.vehicleType,
        capacity: input.capacity,
        fuelType: input.fuelType,
        isElectric: input.isElectric ?? false,
        batteryCapacityKwh: input.batteryCapacityKwh,
        rangeKm: input.rangeKm,
        vendorRelationships: {
          create: {
            vendorOrgId,
            status: "ACTIVE",
            ownershipType: input.ownershipType,
            startsAt: new Date(),
          },
        },
      },
      include: { vendorRelationships: true },
    });
  }

  listForVendor(vendorOrgId: string) {
    return this.prisma.vehicle.findMany({
      where: { vendorRelationships: { some: { vendorOrgId, status: "ACTIVE" } } },
      include: { vendorRelationships: { where: { vendorOrgId } } },
    });
  }

  async getForOrganisation(actor: AuthenticatedUser, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { vendorRelationships: true },
    });
    if (!vehicle) {
      throw new NotFoundException("Vehicle not found");
    }

    const isOwnVendor = vehicle.vendorRelationships.some(
      (rel) => rel.vendorOrgId === actor.organisationId && rel.status === "ACTIVE",
    );
    if (isOwnVendor) {
      return vehicle;
    }

    await this.policy.assertCorporateResourceEligibility(actor.organisationId, "VEHICLE", vehicleId);
    return vehicle;
  }
}
