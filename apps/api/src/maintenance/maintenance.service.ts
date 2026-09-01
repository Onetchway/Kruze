import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { MaintenanceType } from "../../generated/prisma";

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  schedule(
    vehicleId: string,
    input: { type: MaintenanceType; scheduledAt?: string; workshop?: string; notes?: string; blocksDeployment?: boolean },
  ) {
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

  async start(recordId: string) {
    await this.assertExists(recordId);
    return this.prisma.maintenanceRecord.update({ where: { id: recordId }, data: { status: "IN_PROGRESS" } });
  }

  async complete(recordId: string, input: { odometerKm?: number; cost?: number; notes?: string }) {
    await this.assertExists(recordId);
    return this.prisma.maintenanceRecord.update({
      where: { id: recordId },
      data: { status: "COMPLETED", completedAt: new Date(), ...input },
    });
  }

  async cancel(recordId: string) {
    await this.assertExists(recordId);
    return this.prisma.maintenanceRecord.update({ where: { id: recordId }, data: { status: "CANCELLED" } });
  }

  history(vehicleId: string) {
    return this.prisma.maintenanceRecord.findMany({ where: { vehicleId }, orderBy: { createdAt: "desc" } });
  }

  /** Used by planning/allocation: a vehicle with an open blocking record is not deployable. */
  async isDeploymentBlocked(vehicleId: string): Promise<boolean> {
    const blocking = await this.prisma.maintenanceRecord.findFirst({
      where: { vehicleId, blocksDeployment: true, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    });
    return Boolean(blocking);
  }

  private async assertExists(recordId: string) {
    const record = await this.prisma.maintenanceRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException("Maintenance record not found");
    }
    return record;
  }
}
