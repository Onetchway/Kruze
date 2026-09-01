import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class ShiftService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    corporateOrgId: string,
    input: { name: string; startTime: string; endTime: string; pickupWindowMinutes?: number; cutoffMinutesBeforeStart?: number },
  ) {
    return this.prisma.shift.create({
      data: {
        corporateOrgId,
        name: input.name,
        startTime: input.startTime,
        endTime: input.endTime,
        pickupWindowMinutes: input.pickupWindowMinutes ?? 30,
        cutoffMinutesBeforeStart: input.cutoffMinutesBeforeStart ?? 60,
      },
    });
  }

  listForCorporate(corporateOrgId: string) {
    return this.prisma.shift.findMany({ where: { corporateOrgId, active: true } });
  }

  get(shiftId: string) {
    return this.prisma.shift.findUniqueOrThrow({ where: { id: shiftId } });
  }
}
