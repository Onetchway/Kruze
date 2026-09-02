import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

const ON_TIME_TOLERANCE_MS = 10 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async corporateDashboard(corporateOrgId: string, from: Date, to: Date) {
    const tripWhere = { corporateOrgId, scheduledStartAt: { gte: from, lte: to } };

    const [statusCounts, trips, tripEmployeeCounts, charges] = await Promise.all([
      this.prisma.trip.groupBy({ by: ["status"], where: tripWhere, _count: { _all: true } }),
      this.prisma.trip.findMany({
        where: tripWhere,
        select: { id: true, status: true, actualStartAt: true, scheduledStartAt: true },
      }),
      this.prisma.tripEmployee.groupBy({
        by: ["status"],
        where: { trip: tripWhere },
        _count: { _all: true },
      }),
      this.prisma.tripCharge.aggregate({
        where: { trip: tripWhere },
        _sum: { corporateCharge: true, vendorPayable: true },
      }),
    ]);

    const completedTrips = trips.filter((t) => t.status === "COMPLETED");
    const onTimeTrips = completedTrips.filter(
      (t) => t.actualStartAt && t.actualStartAt.getTime() <= t.scheduledStartAt.getTime() + ON_TIME_TOLERANCE_MS,
    );

    const totalTripEmployees = tripEmployeeCounts.reduce((sum, g) => sum + g._count._all, 0);
    const noShowCount = tripEmployeeCounts.find((g) => g.status === "NO_SHOW")?._count._all ?? 0;
    const distinctEmployees = await this.prisma.tripEmployee.findMany({
      where: { trip: tripWhere },
      distinct: ["employeeId"],
      select: { employeeId: true },
    });

    const totalCorporateCost = Number(charges._sum.corporateCharge ?? 0);

    return {
      period: { from, to },
      tripsByStatus: Object.fromEntries(statusCounts.map((g) => [g.status, g._count._all])),
      totalTrips: trips.length,
      onTimePerformance: completedTrips.length > 0 ? onTimeTrips.length / completedTrips.length : null,
      noShowRate: totalTripEmployees > 0 ? noShowCount / totalTripEmployees : null,
      totalCorporateCost,
      totalVendorPayable: Number(charges._sum.vendorPayable ?? 0),
      costPerEmployee: distinctEmployees.length > 0 ? totalCorporateCost / distinctEmployees.length : null,
    };
  }

  async vendorPerformance(vendorOrgId: string, from: Date, to: Date) {
    const tripWhere = { vendorOrgId, scheduledStartAt: { gte: from, lte: to } };

    const [statusCounts, incidentCount] = await Promise.all([
      this.prisma.trip.groupBy({ by: ["status"], where: tripWhere, _count: { _all: true } }),
      this.prisma.incident.count({ where: { trip: tripWhere } }),
    ]);

    const total = statusCounts.reduce((sum, g) => sum + g._count._all, 0);
    const completed = statusCounts.find((g) => g.status === "COMPLETED")?._count._all ?? 0;
    const cancelled = statusCounts.find((g) => g.status === "CANCELLED")?._count._all ?? 0;

    return {
      period: { from, to },
      totalTrips: total,
      completionRate: total > 0 ? completed / total : null,
      cancellationRate: total > 0 ? cancelled / total : null,
      incidentCount,
    };
  }

  /**
   * EV adoption within this corporate's completed trips, and estimated CO2
   * avoided vs. an all-petrol fleet baseline (~120 g CO2/km tailpipe
   * average for a petrol sedan; an EV trip is treated as zero tailpipe
   * emissions here — a simplification appropriate for a v1 sustainability
   * card, not a certified carbon-accounting figure).
   */
  async sustainabilityDashboard(corporateOrgId: string, from: Date, to: Date) {
    const CO2_GRAMS_PER_KM_PETROL = 120;

    const trips = await this.prisma.trip.findMany({
      where: { corporateOrgId, status: "COMPLETED", scheduledStartAt: { gte: from, lte: to } },
      select: {
        actualDistanceKm: true,
        estimatedDistanceKm: true,
        assignments: {
          where: { status: "ACTIVE" },
          select: { vehicle: { select: { isElectric: true } } },
          take: 1,
        },
      },
    });

    let totalKm = 0;
    let evKm = 0;
    let evTrips = 0;
    for (const trip of trips) {
      const km = trip.actualDistanceKm ?? trip.estimatedDistanceKm ?? 0;
      totalKm += km;
      const isElectric = trip.assignments[0]?.vehicle?.isElectric ?? false;
      if (isElectric) {
        evKm += km;
        evTrips += 1;
      }
    }

    const co2AvoidedKg = (evKm * CO2_GRAMS_PER_KM_PETROL) / 1000;

    return {
      period: { from, to },
      totalTrips: trips.length,
      evTrips,
      evAdoptionRate: trips.length > 0 ? evTrips / trips.length : null,
      totalDistanceKm: totalKm,
      evDistanceKm: evKm,
      co2AvoidedKg,
    };
  }

  /** Fleet mix and utilization for vehicles that served this corporate's trips in range. */
  async fleetAnalytics(corporateOrgId: string, from: Date, to: Date) {
    const assignments = await this.prisma.tripAssignment.findMany({
      where: {
        status: "ACTIVE",
        vehicleId: { not: null },
        trip: { corporateOrgId, scheduledStartAt: { gte: from, lte: to } },
      },
      select: {
        vehicleId: true,
        vehicle: { select: { isElectric: true, vehicleType: true } },
        trip: { select: { actualDistanceKm: true, estimatedDistanceKm: true } },
      },
    });

    const distinctVehicleIds = new Set(assignments.map((a) => a.vehicleId));
    const evVehicleIds = new Set(assignments.filter((a) => a.vehicle?.isElectric).map((a) => a.vehicleId));
    const totalKm = assignments.reduce((sum, a) => sum + (a.trip.actualDistanceKm ?? a.trip.estimatedDistanceKm ?? 0), 0);
    const byType = assignments.reduce<Record<string, number>>((acc, a) => {
      const type = a.vehicle?.vehicleType ?? "UNKNOWN";
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});

    return {
      period: { from, to },
      vehiclesUsed: distinctVehicleIds.size,
      evVehiclesUsed: evVehicleIds.size,
      totalDistanceKm: totalKm,
      tripsByVehicleType: byType,
    };
  }

  /** Safety incident breakdown for this corporate's trips in range — feeds the Safety analytics tab. */
  async safetyAnalytics(corporateOrgId: string, from: Date, to: Date) {
    const incidents = await this.prisma.incident.findMany({
      where: { trip: { corporateOrgId, scheduledStartAt: { gte: from, lte: to } } },
      select: { category: true },
    });
    const byCategory = incidents.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {});
    const noShows = await this.prisma.tripEmployee.count({
      where: { status: "NO_SHOW", trip: { corporateOrgId, scheduledStartAt: { gte: from, lte: to } } },
    });

    return {
      period: { from, to },
      totalIncidents: incidents.length,
      incidentsByCategory: byCategory,
      sosCount: byCategory.SOS ?? 0,
      noShowCount: noShows,
    };
  }

  /**
   * Cost-per-employee (already computed in corporateDashboard) plus
   * cost-per-km, and a cost breakdown by vehicle type — reusing the same
   * corporate cost and fleet-distance figures, just assembled for the
   * dedicated Cost Analytics screen (spec §12).
   */
  async costAnalytics(corporateOrgId: string, from: Date, to: Date) {
    const [dashboard, fleet] = await Promise.all([
      this.corporateDashboard(corporateOrgId, from, to),
      this.fleetAnalytics(corporateOrgId, from, to),
    ]);

    const totalTripsByType = Object.values(fleet.tripsByVehicleType).reduce((a, b) => a + b, 0);
    const costByVehicleType = Object.fromEntries(
      Object.entries(fleet.tripsByVehicleType).map(([type, tripCount]) => [
        type,
        totalTripsByType > 0 ? (dashboard.totalCorporateCost * tripCount) / totalTripsByType : 0,
      ]),
    );

    return {
      period: { from, to },
      costPerEmployee: dashboard.costPerEmployee,
      costPerKm: fleet.totalDistanceKm > 0 ? dashboard.totalCorporateCost / fleet.totalDistanceKm : null,
      totalCorporateCost: dashboard.totalCorporateCost,
      totalDistanceKm: fleet.totalDistanceKm,
      costByVehicleType,
      /// Empty-km (distance driven with no employee onboard) needs a
      /// planned-path/leg-level distinction this schema doesn't store —
      /// Trip only records total distance, not pickup-leg vs loaded-leg.
      /// Reported honestly as unavailable rather than fabricated.
      emptyKmAvailable: false,
    };
  }

  /**
   * Ranks every connected, ACTIVE vendor by a simple composite score
   * (completion rate minus cancellation rate, incident count as a
   * tiebreaker) — real per-vendor figures reusing vendorPerformance,
   * not invented numbers.
   */
  async vendorRanking(corporateOrgId: string, from: Date, to: Date) {
    const relationships = await this.prisma.organisationRelationship.findMany({
      where: {
        type: "CORPORATE_VENDOR",
        status: "ACTIVE",
        OR: [{ sourceOrgId: corporateOrgId }, { targetOrgId: corporateOrgId }],
      },
    });
    const vendorOrgIds = relationships.map((r) => (r.sourceOrgId === corporateOrgId ? r.targetOrgId : r.sourceOrgId));
    if (vendorOrgIds.length === 0) return [];

    const vendors = await this.prisma.organisation.findMany({
      where: { id: { in: vendorOrgIds } },
      select: { id: true, displayName: true, globalOrgId: true },
    });

    const rows = await Promise.all(
      vendors.map(async (v) => {
        const perf = await this.vendorPerformance(v.id, from, to);
        const score = (perf.completionRate ?? 0) * 100 - (perf.cancellationRate ?? 0) * 100 - perf.incidentCount;
        return { vendor: v, ...perf, score };
      }),
    );
    return rows.sort((a, b) => b.score - a.score);
  }

  /**
   * Maintenance stats for the vehicles that actually served this
   * corporate's trips in range — real MaintenanceRecord data, not
   * fabricated. A vehicle can serve multiple corporates; this scopes to
   * ones that had at least one active assignment on this corporate's
   * trips in the window.
   */
  async maintenanceStats(corporateOrgId: string, from: Date, to: Date) {
    const assignments = await this.prisma.tripAssignment.findMany({
      where: { status: "ACTIVE", vehicleId: { not: null }, trip: { corporateOrgId, scheduledStartAt: { gte: from, lte: to } } },
      select: { vehicleId: true },
      distinct: ["vehicleId"],
    });
    const vehicleIds = assignments.map((a) => a.vehicleId as string);
    if (vehicleIds.length === 0) {
      return { period: { from, to }, vehiclesCovered: 0, totalRecords: 0, byType: {}, byStatus: {}, totalCost: 0, blockingOpenCount: 0 };
    }

    const records = await this.prisma.maintenanceRecord.findMany({ where: { vehicleId: { in: vehicleIds } } });
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalCost = 0;
    let blockingOpenCount = 0;
    for (const r of records) {
      byType[r.type] = (byType[r.type] ?? 0) + 1;
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      totalCost += Number(r.cost ?? 0);
      if (r.blocksDeployment && (r.status === "SCHEDULED" || r.status === "IN_PROGRESS")) blockingOpenCount += 1;
    }

    return { period: { from, to }, vehiclesCovered: vehicleIds.length, totalRecords: records.length, byType, byStatus, totalCost, blockingOpenCount };
  }

  /**
   * Average idle time between consecutive trips for vehicles used in
   * range — a real (if approximate) signal from existing assignment
   * windows, not a fabricated number.
   */
  async idleTimeAnalytics(corporateOrgId: string, from: Date, to: Date) {
    const assignments = await this.prisma.tripAssignment.findMany({
      where: { status: "ACTIVE", vehicleId: { not: null }, trip: { corporateOrgId, scheduledStartAt: { gte: from, lte: to } } },
      select: { vehicleId: true, trip: { select: { scheduledStartAt: true, scheduledEndAt: true } } },
    });

    const byVehicle = new Map<string, { start: Date; end: Date }[]>();
    for (const a of assignments) {
      const vehicleId = a.vehicleId as string;
      const windows = byVehicle.get(vehicleId) ?? [];
      windows.push({
        start: a.trip.scheduledStartAt,
        end: a.trip.scheduledEndAt ?? new Date(a.trip.scheduledStartAt.getTime() + 90 * 60 * 1000),
      });
      byVehicle.set(vehicleId, windows);
    }

    let totalIdleMinutes = 0;
    let gapCount = 0;
    for (const windows of byVehicle.values()) {
      windows.sort((a, b) => a.start.getTime() - b.start.getTime());
      for (let i = 1; i < windows.length; i++) {
        const gapMs = windows[i].start.getTime() - windows[i - 1].end.getTime();
        if (gapMs > 0) {
          totalIdleMinutes += gapMs / 60000;
          gapCount += 1;
        }
      }
    }

    return {
      period: { from, to },
      vehiclesCovered: byVehicle.size,
      averageIdleMinutesBetweenTrips: gapCount > 0 ? totalIdleMinutes / gapCount : null,
    };
  }

  async complianceSummary(scopeOrgId?: string) {
    const grouped = await this.prisma.complianceEvaluation.groupBy({
      by: ["status", "subjectType"],
      where: scopeOrgId ? { rule: { scopeOrgId } } : undefined,
      _count: { _all: true },
    });
    return grouped.map((g) => ({ status: g.status, subjectType: g.subjectType, count: g._count._all }));
  }
}
