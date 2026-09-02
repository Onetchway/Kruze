import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class ShiftService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    corporateOrgId: string,
    input: {
      name: string;
      startTime: string;
      endTime: string;
      pickupWindowMinutes?: number;
      cutoffMinutesBeforeStart?: number;
      maxRideTimeMinutes?: number;
      transportRequired?: boolean;
      nightShift?: boolean;
      safetyPolicyId?: string;
    },
  ) {
    return this.prisma.shift.create({
      data: {
        corporateOrgId,
        name: input.name,
        startTime: input.startTime,
        endTime: input.endTime,
        pickupWindowMinutes: input.pickupWindowMinutes ?? 30,
        cutoffMinutesBeforeStart: input.cutoffMinutesBeforeStart ?? 60,
        maxRideTimeMinutes: input.maxRideTimeMinutes,
        transportRequired: input.transportRequired ?? true,
        nightShift: input.nightShift ?? false,
        safetyPolicyId: input.safetyPolicyId,
      },
    });
  }

  listForCorporate(corporateOrgId: string) {
    return this.prisma.shift.findMany({ where: { corporateOrgId, active: true }, include: { safetyPolicy: true } });
  }

  get(shiftId: string) {
    return this.prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
  }

  async update(
    corporateOrgId: string,
    shiftId: string,
    input: Partial<{
      name: string;
      startTime: string;
      endTime: string;
      pickupWindowMinutes: number;
      cutoffMinutesBeforeStart: number;
      maxRideTimeMinutes: number;
      transportRequired: boolean;
      nightShift: boolean;
      safetyPolicyId: string;
      active: boolean;
    }>,
  ) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) {
      throw new NotFoundException("Shift not found");
    }
    if (shift.corporateOrgId !== corporateOrgId) {
      throw new ForbiddenException("Shift belongs to a different corporate");
    }
    return this.prisma.shift.update({ where: { id: shiftId }, data: input, include: { safetyPolicy: true } });
  }
}
