import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Aggregate, platform-wide counts for the six-category Super Admin
 * dashboard (spec "five questions" north star). Every number here is a
 * real database aggregate — nothing fabricated. This deliberately stops
 * at counts/sums; per-tenant operational detail lives in corporate-web /
 * control-room-web, not here.
 */
@Injectable()
export class PlatformDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      orgsByStatus,
      orgsTotal,
      corporateOrgCount,
      vendorOrgCount,
      operatorOrgCount,
      activeRelationships,
      totalUsers,
      activeMemberships,
      driverCount,
      vehicleCount,
      guardCount,
      employeeCount,
      tripsTotal,
      tripsToday,
      tripsRunning,
      exceptionsOpen,
      safetyEventsOpen,
      subscriptionsByStatus,
      activePlansWithRevenue,
      usageRecordsRecent,
      eventsLast24h,
      auditEventsLast24h,
      failedLoginsLast24h,
      suspendedOrgCount,
      roleChangesLast24h,
    ] = await Promise.all([
      this.prisma.organisation.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.organisation.count(),
      this.prisma.organisation.count({ where: { roles: { has: "CORPORATE" } } }),
      this.prisma.organisation.count({ where: { roles: { has: "VENDOR" } } }),
      this.prisma.organisation.count({ where: { roles: { has: "FLEET_OPERATOR" } } }),
      this.prisma.organisationRelationship.count({ where: { status: "ACTIVE" } }),
      this.prisma.user.count(),
      this.prisma.organisationMembership.count({ where: { status: "ACTIVE" } }),
      this.prisma.driver.count(),
      this.prisma.vehicle.count(),
      this.prisma.guard.count(),
      this.prisma.employee.count(),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { scheduledStartAt: { gte: dayAgo } } }),
      this.prisma.trip.count({ where: { status: { in: ["RUNNING", "EN_ROUTE_TO_FIRST_PICKUP", "DRIVER_ACCEPTED"] } } }),
      this.prisma.planException.count({ where: { status: { not: "RESOLVED" } } }),
      this.prisma.safetyEvent.count({ where: { status: "OPEN" } }),
      this.prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIAL"] } },
        include: { plan: { select: { monthlyPriceCents: true } } },
      }),
      this.prisma.usageRecord.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.eventLogEntry.count({ where: { consumedAt: { gte: dayAgo } } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.auditLog.count({ where: { action: "LOGIN_FAILED", createdAt: { gte: dayAgo } } }),
      this.prisma.organisation.count({ where: { status: "SUSPENDED" } }),
      this.prisma.auditLog.count({ where: { action: { contains: "ROLE" }, createdAt: { gte: dayAgo } } }),
    ]);

    const mrrCents = activePlansWithRevenue
      .filter((s) => s.status === "ACTIVE")
      .reduce((sum, s) => sum + s.plan.monthlyPriceCents, 0);

    return {
      organisations: {
        total: orgsTotal,
        byStatus: Object.fromEntries(orgsByStatus.map((r) => [r.status, r._count._all])),
        corporate: corporateOrgCount,
        vendor: vendorOrgCount,
        operator: operatorOrgCount,
        activeRelationships,
      },
      corporate: {
        organisations: corporateOrgCount,
        employees: employeeCount,
      },
      vendors: {
        organisations: vendorOrgCount,
        drivers: driverCount,
        vehicles: vehicleCount,
        guards: guardCount,
      },
      platformUsage: {
        totalUsers,
        activeMemberships,
        drivers: driverCount,
        vehicles: vehicleCount,
        guards: guardCount,
        employees: employeeCount,
        tripsTotal,
        tripsScheduledLast24h: tripsToday,
        tripsRunningNow: tripsRunning,
        openExceptions: exceptionsOpen,
        openSafetyEvents: safetyEventsOpen,
      },
      subscription: {
        byStatus: Object.fromEntries(subscriptionsByStatus.map((r) => [r.status, r._count._all])),
        mrrCents,
        mrr: mrrCents / 100,
        activeOrTrialCount: activePlansWithRevenue.length,
      },
      systemHealth: {
        eventsConsumedLast24h: eventsLast24h,
        usageRecordsLast24h: usageRecordsRecent,
      },
      security: {
        auditEventsLast24h,
        failedLoginsLast24h,
        suspendedOrganisations: suspendedOrgCount,
        roleChangesLast24h,
      },
    };
  }
}
