import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";

function parseRange(from?: string, to?: string) {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { fromDate, toDate };
}

@Controller("analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("corporate/dashboard")
  corporateDashboard(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.corporateDashboard(user.organisationId, fromDate, toDate);
  }

  @Get("vendor/performance")
  vendorPerformance(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    const { fromDate, toDate } = parseRange(from, to);
    return this.analytics.vendorPerformance(user.organisationId, fromDate, toDate);
  }

  @Get("compliance/summary")
  complianceSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.complianceSummary(user.organisationId);
  }
}
