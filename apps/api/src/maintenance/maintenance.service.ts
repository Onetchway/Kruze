import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { MaintenanceType } from "../../generated/prisma";

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(
    actor: AuthenticatedUser,
    vehicleId: string,
    input: { type: MaintenanceType; scheduledAt?: string; workshop?: string; notes?: string; blocksDeployment?: boolean },
  ) {
    await this.assertVehicleAccess(actor, vehicleId);
    return this.prisma.maintenanceRecord.create({
      data: {
        vehicleId,
        type: input.type,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        workshop: input.workshop,
        notes: input.notes,
        blocksDeployment: input.blocksDeployment ?? true,
      },
    });
  }

  async start(actor: AuthenticatedUser, recordId: string) {
    await this.assertRecordAccess(actor, recordId);
    return this.prisma.maintenanceRecord.update({ where: { id: recordId }, data: { status: "IN_PROGRESS" } });
  }

  async complete(actor: AuthenticatedUser, recordId: string, input: { odometerKm?: number; cost?: number; notes?: string }) {
    await this.assertRecordAccess(actor, recordId);
    return this.prisma.maintenanceRecord.update({
      where: { id: recordId },
      data: { status: "COMPLETED", completedAt: new Date(), ...input },
    });
  }

  async cancel(actor: AuthenticatedUser, recordId: string) {
    await this.assertRecordAccess(actor, recordId);
    return this.prisma.maintenanceRecord.update({ where: { id: recordId }, data: { status: "CANCELLED" } });
  }

  async history(actor: AuthenticatedUser, vehicleId: string) {
    await this.assertVehicleAccess(actor, vehicleId);
    return this.prisma.maintenanceRecord.findMany({ where: { vehicleId }, orderBy: { createdAt: "desc" } });
  }

  /** Used by planning/allocation: a vehicle with an open blocking record is not deployable. */
  async isDeploymentBlocked(vehicleId: string): Promise<boolean> {
    const blocking = await this.prisma.maintenanceRecord.findFirst({
      where: { vehicleId, blocksDeployment: true, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    });
    return Boolean(blocking);
  }

  private async assertVehicleAccess(actor: AuthenticatedUser, vehicleId: string) {
    const relationship = await this.prisma.vehicleVendorRelationship.findFirst({
      where: { vehicleId, vendorOrgId: actor.organisationId, status: "ACTIVE" },
    });
    if (!relationship) {
      throw new ForbiddenException("Not the vendor for this vehicle");
    }
  }

  private async assertRecordAccess(actor: AuthenticatedUser, recordId: string) {
    const record = await this.prisma.maintenanceRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException("Maintenance record not found");
    }
    await this.assertVehicleAccess(actor, record.vehicleId);
    return record;
  }
}
