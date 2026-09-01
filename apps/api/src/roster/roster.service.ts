import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { RosterEntryStatus } from "../../generated/prisma";

function shiftStartAt(date: Date, startTime: string): Date {
  const [hours, minutes] = startTime.split(":").map(Number);
  const start = new Date(date);
  start.setUTCHours(hours, minutes, 0, 0);
  return start;
}

@Injectable()
export class RosterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Opt-in/opt-out/cancel for one employee on one date. Employees are
   * subject to the shift's booking cut-off; corporate transport admins
   * (managing HRMS-driven or bulk changes) are not.
   */
  async upsertEntry(
    actor: AuthenticatedUser,
    input: { employeeId: string; shiftId: string; date: string; status: RosterEntryStatus },
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee || employee.corporateOrgId !== actor.organisationId) {
      throw new NotFoundException("Employee not found in this corporate");
    }

    const shift = await this.prisma.shift.findUnique({ where: { id: input.shiftId } });
    if (!shift || shift.corporateOrgId !== actor.organisationId) {
      throw new NotFoundException("Shift not found in this corporate");
    }

    if (actor.role === "EMPLOYEE") {
      const date = new Date(input.date);
      const cutoff = new Date(shiftStartAt(date, shift.startTime).getTime() - shift.cutoffMinutesBeforeStart * 60_000);
      if (new Date() > cutoff) {
        throw new BadRequestException("Booking cut-off has passed for this shift/date");
      }
    }

    return this.prisma.rosterEntry.upsert({
      where: { employeeId_shiftId_date: { employeeId: input.employeeId, shiftId: input.shiftId, date: new Date(input.date) } },
      create: {
        employeeId: input.employeeId,
        shiftId: input.shiftId,
        date: new Date(input.date),
        status: input.status,
        source: actor.role === "EMPLOYEE" ? "EMPLOYEE_SELF_SERVICE" : "ADMIN",
      },
      update: {
        status: input.status,
        version: { increment: 1 },
      },
    });
  }

  async cancel(actor: AuthenticatedUser, rosterEntryId: string) {
    const entry = await this.prisma.rosterEntry.findUnique({
      where: { id: rosterEntryId },
      include: { employee: true },
    });
    if (!entry) {
      throw new NotFoundException("Roster entry not found");
    }
    if (entry.employee.corporateOrgId !== actor.organisationId) {
      throw new ForbiddenException("Roster entry belongs to a different corporate");
    }
    return this.prisma.rosterEntry.update({
      where: { id: rosterEntryId },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
  }

  /** Transport demand for a shift/date: every OPTED_IN (not later cancelled) entry. */
  listDemand(shiftId: string, date: string) {
    return this.prisma.rosterEntry.findMany({
      where: { shiftId, date: new Date(date), status: "OPTED_IN" },
      include: { employee: true },
    });
  }
}
