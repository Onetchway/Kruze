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

  /** Bulk opt-in a set of employees into a shift across a set of dates (e.g. "roster this shift for these employees, every weekday this week"). */
  async bulkUpsert(actor: AuthenticatedUser, input: { shiftId: string; employeeIds: string[]; dates: string[] }) {
    const shift = await this.prisma.shift.findUnique({ where: { id: input.shiftId } });
    if (!shift || shift.corporateOrgId !== actor.organisationId) {
      throw new NotFoundException("Shift not found in this corporate");
    }

    const employees = await this.prisma.employee.findMany({ where: { id: { in: input.employeeIds } } });
    const validEmployeeIds = new Set(
      employees.filter((e) => e.corporateOrgId === actor.organisationId).map((e) => e.id),
    );
    if (validEmployeeIds.size === 0) {
      throw new BadRequestException("None of the given employees belong to this corporate");
    }

    const entries = [];
    for (const employeeId of validEmployeeIds) {
      for (const date of input.dates) {
        entries.push(
          this.prisma.rosterEntry.upsert({
            where: { employeeId_shiftId_date: { employeeId, shiftId: input.shiftId, date: new Date(date) } },
            create: { employeeId, shiftId: input.shiftId, date: new Date(date), status: "OPTED_IN", source: "ADMIN" },
            update: { status: "OPTED_IN", version: { increment: 1 } },
          }),
        );
      }
    }
    return Promise.all(entries);
  }

  /** All roster entries for this corporate across an optional shift/date-range filter — powers the Rosters screen. */
  async listForCorporate(
    actor: AuthenticatedUser,
    filters: { shiftId?: string; from?: string; to?: string },
  ) {
    return this.prisma.rosterEntry.findMany({
      where: {
        employee: { corporateOrgId: actor.organisationId },
        ...(filters.shiftId ? { shiftId: filters.shiftId } : {}),
        ...(filters.from || filters.to
          ? {
              date: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: { employee: true, shift: true },
      orderBy: { date: "asc" },
    });
  }

  /**
   * "Transport Requests" view: every roster entry with a derived request
   * status. A cancelled entry is CANCELLED; otherwise, if a trip already
   * covers this employee on the same shift/date, its trip status maps to
   * ASSIGNED/COMPLETED/CANCELLED; with no trip yet, it's NEW (opted in,
   * not yet picked up by a plan).
   */
  async listRequestsForCorporate(actor: AuthenticatedUser, filters: { from?: string; to?: string }) {
    const entries = await this.listForCorporate(actor, filters);
    if (entries.length === 0) return [];

    const tripEmployees = await this.prisma.tripEmployee.findMany({
      where: {
        employeeId: { in: entries.map((e) => e.employeeId) },
        trip: {
          scheduledStartAt: {
            gte: new Date(Math.min(...entries.map((e) => e.date.getTime()))),
            lt: new Date(Math.max(...entries.map((e) => e.date.getTime())) + 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { trip: true },
    });

    return entries.map((entry) => {
      if (entry.status === "CANCELLED") {
        return { ...entry, requestStatus: "CANCELLED" as const };
      }
      const match = tripEmployees.find(
        (te) =>
          te.employeeId === entry.employeeId &&
          te.trip.shiftId === entry.shiftId &&
          te.trip.scheduledStartAt.toDateString() === entry.date.toDateString(),
      );
      if (!match) {
        return { ...entry, requestStatus: "NEW" as const };
      }
      const status: "COMPLETED" | "CANCELLED" | "APPROVED" | "ASSIGNED" =
        match.trip.status === "COMPLETED"
          ? "COMPLETED"
          : match.trip.status === "CANCELLED" || match.trip.status === "FAILED"
            ? "CANCELLED"
            : match.trip.status === "CREATED"
              ? "APPROVED"
              : "ASSIGNED";
      return { ...entry, requestStatus: status };
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
