import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * EV telemetry (spec §6.28/§7.27): SOC/range live state kept separate from
 * the vehicle identity record and from raw GPS history, and charging
 * session history. `rangeEligible` is the range-aware allocation check the
 * planning engine calls before assigning an EV to a trip.
 */
@Injectable()
export class EvService {
  constructor(private readonly prisma: PrismaService) {}

  async updateBatteryState(
    vehicleId: string,
    input: { socPercent: number; estimatedRangeKm?: number; chargingStatus?: string },
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException("Vehicle not found");
    }
    if (!vehicle.isElectric) {
      throw new BadRequestException("Vehicle is not marked as electric");
    }

    return this.prisma.vehicleBatteryState.upsert({
      where: { vehicleId },
      create: {
        vehicleId,
        socPercent: input.socPercent,
        estimatedRangeKm: input.estimatedRangeKm,
        chargingStatus: input.chargingStatus ?? "IDLE",
      },
      update: {
        socPercent: input.socPercent,
        estimatedRangeKm: input.estimatedRangeKm,
        chargingStatus: input.chargingStatus ?? "IDLE",
        recordedAt: new Date(),
      },
    });
  }

  getBatteryState(vehicleId: string) {
    return this.prisma.vehicleBatteryState.findUnique({ where: { vehicleId } });
  }

  logChargingSession(
    vehicleId: string,
    input: {
      startedAt: string;
      endedAt?: string;
      startSocPercent?: number;
      endSocPercent?: number;
      energyKwh?: number;
      cost?: number;
      location?: string;
    },
  ) {
    return this.prisma.chargingSession.create({
      data: {
        vehicleId,
        startedAt: new Date(input.startedAt),
        endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
        startSocPercent: input.startSocPercent,
        endSocPercent: input.endSocPercent,
        energyKwh: input.energyKwh,
        cost: input.cost,
        location: input.location,
      },
    });
  }

  chargingHistory(vehicleId: string) {
    return this.prisma.chargingSession.findMany({ where: { vehicleId }, orderBy: { startedAt: "desc" }, take: 100 });
  }

  /**
   * Is this vehicle's current estimated range enough for the required
   * distance, with a safety buffer? Non-EV vehicles are always eligible —
   * range constraints only apply where they're meaningful.
   */
  async rangeEligible(vehicleId: string, requiredRangeKm: number, bufferPercent = 15): Promise<boolean> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || !vehicle.isElectric) {
      return true;
    }

    const state = await this.prisma.vehicleBatteryState.findUnique({ where: { vehicleId } });
    const availableRangeKm = state?.estimatedRangeKm ?? vehicle.rangeKm ?? 0;
    return availableRangeKm >= requiredRangeKm * (1 + bufferPercent / 100);
  }
}
