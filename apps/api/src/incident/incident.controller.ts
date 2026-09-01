import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { IncidentService } from "./incident.service";
import { OperationsService } from "./operations.service";
import { ReportIncidentDto } from "./dto/report-incident.dto";
import { CloseIncidentDto } from "./dto/close-incident.dto";
import { MarkNoShowDto } from "./dto/mark-no-show.dto";
import { ReportBreakdownDto, ReplaceResourceDto } from "./dto/breakdown-replacement.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("incidents")
@UseGuards(JwtAuthGuard)
export class IncidentController {
  constructor(private readonly incidents: IncidentService) {}

  @Post()
  @Audited({ action: "INCIDENT_REPORTED", resourceType: "Incident" })
  report(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReportIncidentDto) {
    return this.incidents.report(user, dto);
  }

  @Post(":id/close")
  @Audited({ action: "INCIDENT_CLOSED", resourceType: "Incident" })
  close(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CloseIncidentDto) {
    return this.incidents.close(user, id, dto.correctiveAction);
  }

  @Get()
  list(@Query("status") status?: string) {
    return this.incidents.list(status);
  }
}

@Controller("sos")
@UseGuards(JwtAuthGuard)
export class SosController {
  constructor(private readonly incidents: IncidentService) {}

  @Post()
  @Audited({ action: "SOS_RAISED", resourceType: "Incident" })
  raise(@CurrentUser() user: AuthenticatedUser, @Body() dto: Omit<ReportIncidentDto, "category">) {
    return this.incidents.report(user, { ...dto, category: "SOS" });
  }
}

@Controller("trips/:tripId")
@UseGuards(JwtAuthGuard)
export class TripOperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Post("breakdown")
  @Audited({ action: "TRIP_BREAKDOWN_REPORTED", resourceType: "Trip" })
  breakdown(@CurrentUser() user: AuthenticatedUser, @Param("tripId") tripId: string, @Body() dto: ReportBreakdownDto) {
    return this.operations.reportBreakdown(user, tripId, dto.description);
  }

  @Post("replace")
  @Audited({ action: "TRIP_RESOURCE_REPLACED", resourceType: "TripAssignment" })
  replace(@CurrentUser() user: AuthenticatedUser, @Param("tripId") tripId: string, @Body() dto: ReplaceResourceDto) {
    return this.operations.replace(user, tripId, dto);
  }
}

@Controller("trip-employees/:tripEmployeeId")
@UseGuards(JwtAuthGuard)
export class NoShowController {
  constructor(private readonly operations: OperationsService) {}

  @Post("no-show")
  @Audited({ action: "EMPLOYEE_NO_SHOW", resourceType: "TripEmployee" })
  markNoShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param("tripEmployeeId") tripEmployeeId: string,
    @Body() dto: MarkNoShowDto,
  ) {
    return this.operations.markNoShow(user, tripEmployeeId, dto.reason);
  }
}
