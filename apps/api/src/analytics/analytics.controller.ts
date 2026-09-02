import { Controller, ForbiddenException, Get, Query, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { PrismaService } from "../common/prisma/prisma.service";

function parseRange(from?: string, to?: string) {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { fromDate, toDate };
}

@Controller("analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("corporate/dashboard")
  corporateDashboard(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.corporateDashboard(user.organisationId, fromDate, toDate);
  }

  /**
   * Defaults to the caller's own org (a vendor viewing its own scorecard).
   * A corporate may pass ?vendorOrgId=... for a connected vendor's
   * performance — verified against an ACTIVE CORPORATE_VENDOR relationship
   * so a corporate can never pull a stranger vendor's numbers.
   */
  @Get("vendor/performance")
  async vendorPerformance(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("vendorOrgId") vendorOrgId?: string,
  ) {
    const { fromDate, toDate } = parseRange(from, to);
    const targetOrgId = await this.resolveVendorScope(user, vendorOrgId);
    return this.analytics.vendorPerformance(targetOrgId, fromDate, toDate);
  }

  @Get("compliance/summary")
  async complianceSummary(@CurrentUser() user: AuthenticatedUser, @Query("vendorOrgId") vendorOrgId?: string) {
    const targetOrgId = await this.resolveVendorScope(user, vendorOrgId);
    return this.analytics.complianceSummary(targetOrgId);
  }

  @Get("sustainability")
  sustainability(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.sustainabilityDashboard(user.organisationId, fromDate, toDate);
  }

  @Get("fleet")
  fleetAnalytics(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.fleetAnalytics(user.organisationId, fromDate, toDate);
  }

  @Get("safety")
  safetyAnalytics(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.safetyAnalytics(user.organisationId, fromDate, toDate);
  }

  @Get("cost")
  costAnalytics(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.costAnalytics(user.organisationId, fromDate, toDate);
  }

  @Get("vendor-ranking")
  vendorRanking(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.vendorRanking(user.organisationId, fromDate, toDate);
  }

  @Get("maintenance")
  maintenanceStats(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.maintenanceStats(user.organisationId, fromDate, toDate);
  }

  @Get("idle-time")
  idleTime(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.idleTimeAnalytics(user.organisationId, fromDate, toDate);
  }

  /** Own org by default; a connected vendor's org only with an ACTIVE CORPORATE_VENDOR relationship in place. */
  private async resolveVendorScope(user: AuthenticatedUser, vendorOrgId?: string): Promise<string> {
    if (!vendorOrgId || vendorOrgId === user.organisationId) {
      return user.organisationId;
    }
    const relationship = await this.prisma.organisationRelationship.findFirst({
      where: {
        type: "CORPORATE_VENDOR",
        status: "ACTIVE",
        OR: [
          { sourceOrgId: user.organisationId, targetOrgId: vendorOrgId },
          { sourceOrgId: vendorOrgId, targetOrgId: user.organisationId },
        ],
      },
    });
    if (!relationship) {
      throw new ForbiddenException("No active relationship with this vendor");
    }
    return vendorOrgId;
  }
}
