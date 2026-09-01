import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { MaintenanceService } from "./maintenance.service";
import { ScheduleMaintenanceDto } from "./dto/schedule-maintenance.dto";
import { CompleteMaintenanceDto } from "./dto/complete-maintenance.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("vehicles/:vehicleId/maintenance")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PlatformRole.VENDOR_ADMIN, PlatformRole.FLEET_OPERATOR_ADMIN)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Post()
  @Audited({ action: "MAINTENANCE_SCHEDULED", resourceType: "MaintenanceRecord" })
  schedule(@CurrentUser() user: AuthenticatedUser, @Param("vehicleId") vehicleId: string, @Body() dto: ScheduleMaintenanceDto) {
    return this.maintenance.schedule(user, vehicleId, dto);
  }

  @Get()
  history(@CurrentUser() user: AuthenticatedUser, @Param("vehicleId") vehicleId: string) {
    return this.maintenance.history(user, vehicleId);
  }
}

@Controller("maintenance-records/:id")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PlatformRole.VENDOR_ADMIN, PlatformRole.FLEET_OPERATOR_ADMIN)
export class MaintenanceRecordController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Post("start")
  @Audited({ action: "MAINTENANCE_STARTED", resourceType: "MaintenanceRecord" })
  start(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.maintenance.start(user, id);
  }

  @Post("complete")
  @Audited({ action: "MAINTENANCE_COMPLETED", resourceType: "MaintenanceRecord" })
  complete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CompleteMaintenanceDto) {
    return this.maintenance.complete(user, id, dto);
  }

  @Post("cancel")
  @Audited({ action: "MAINTENANCE_CANCELLED", resourceType: "MaintenanceRecord" })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.maintenance.cancel(user, id);
  }
}
