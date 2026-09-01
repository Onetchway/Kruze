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

  async complianceSummary(scopeOrgId?: string) {
    const grouped = await this.prisma.complianceEvaluation.groupBy({
      by: ["status", "subjectType"],
      where: scopeOrgId ? { rule: { scopeOrgId } } : undefined,
      _count: { _all: true },
    });
    return grouped.map((g) => ({ status: g.status, subjectType: g.subjectType, count: g._count._all }));
  }
}
