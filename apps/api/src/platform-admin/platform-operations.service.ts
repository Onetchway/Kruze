import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Platform-wide Transport Operations visibility (spec §26): trip status
 * breakdown, upcoming/completed/cancelled/exceptions counts, SOS counts —
 * every number a real aggregate over Trip/PlanException/Incident, same
 * "counts and lists, no live map" scope as the Dashboard KPIs. No Maps/GPS
 * provider key exists in this environment, so no live-position rendering.
 */
@Injectable()
export class PlatformOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const [statusByCountToday, exceptionsOpen, exceptionsByType, sosActive, sosByCategoryOpen] = await Promise.all([
      this.prisma.trip.groupBy({
        by: ["status"],
        where: { scheduledStartAt: { gte: startOfDay, lt: endOfDay } },
        _count: { _all: true },
      }),
      this.prisma.planException.count({ where: { status: { not: "RESOLVED" } } }),
      this.prisma.planException.groupBy({ by: ["type"], where: { status: { not: "RESOLVED" } }, _count: { _all: true } }),
      this.prisma.trip.count({ where: { status: "SOS_ACTIVE" } }),
      this.prisma.incident.groupBy({ by: ["category"], where: { status: { in: ["OPEN", "INVESTIGATING"] } }, _count: { _all: true } }),
    ]);

    const byStatus = Object.fromEntries(statusByCountToday.map((r) => [r.status, r._count._all]));
    // Map the raw TripStatus enum onto the spec's Live-Operations buckets
    // (Planned/Assigned/Driver En Route/Pickup Started/In Progress/
    // Completed/Cancelled/Exceptions) — a display grouping, not a new
    // status model.
    const liveOperations = {
      planned: (byStatus["CREATED"] ?? 0) + (byStatus["SCHEDULED"] ?? 0),
      assigned: byStatus["RESOURCES_ASSIGNED"] ?? 0,
      driverEnRoute: byStatus["EN_ROUTE_TO_FIRST_PICKUP"] ?? 0,
      pickupStarted: byStatus["DRIVER_ACCEPTED"] ?? 0,
      inProgress: (byStatus["RUNNING"] ?? 0) + (byStatus["PAUSED"] ?? 0) + (byStatus["REASSIGNING"] ?? 0),
      completed: byStatus["COMPLETED"] ?? 0,
      cancelled: (byStatus["CANCELLED"] ?? 0) + (byStatus["NO_SHOW"] ?? 0) + (byStatus["FAILED"] ?? 0),
      exceptions: (byStatus["BREAKDOWN"] ?? 0) + (byStatus["SOS_ACTIVE"] ?? 0) + exceptionsOpen,
    };

    return {
      todayTripStatusRaw: byStatus,
      liveOperations,
      planExceptions: {
        open: exceptionsOpen,
        byType: Object.fromEntries(exceptionsByType.map((r) => [r.type, r._count._all])),
      },
      sos: {
        activeTripsInSos: sosActive,
        openIncidentsByCategory: Object.fromEntries(sosByCategoryOpen.map((r) => [r.category, r._count._all])),
      },
    };
  }

  async listTrips(params: { status?: string; corporateOrgId?: string; vendorOrgId?: string; cursor?: string; limit?: number } = {}) {
    const { status, corporateOrgId, vendorOrgId, cursor, limit = 50 } = params;
    const trips = await this.prisma.trip.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(corporateOrgId ? { corporateOrgId } : {}),
        ...(vendorOrgId ? { vendorOrgId } : {}),
      },
      orderBy: { scheduledStartAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        corporateOrg: { select: { id: true, displayName: true } },
        vendorOrg: { select: { id: true, displayName: true } },
        assignments: { where: { status: "ACTIVE" }, include: { driver: { select: { fullName: true } }, vehicle: { select: { registrationNo: true } } } },
      },
    });
    const hasMore = trips.length > limit;
    const page = hasMore ? trips.slice(0, limit) : trips;
    return { trips: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  }
}
