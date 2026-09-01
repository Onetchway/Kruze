import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { EvService } from "./ev.service";
import { UpdateBatteryStateDto } from "./dto/update-battery-state.dto";
import { LogChargingSessionDto } from "./dto/log-charging-session.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("vehicles/:vehicleId/ev")
@UseGuards(JwtAuthGuard)
export class EvController {
  constructor(private readonly ev: EvService) {}

  @Post("battery-state")
  @Audited({ action: "VEHICLE_BATTERY_STATE_UPDATED", resourceType: "VehicleBatteryState" })
  updateBatteryState(@CurrentUser() user: AuthenticatedUser, @Param("vehicleId") vehicleId: string, @Body() dto: UpdateBatteryStateDto) {
    return this.ev.updateBatteryState(user, vehicleId, dto);
  }

  @Get("battery-state")
  getBatteryState(@CurrentUser() user: AuthenticatedUser, @Param("vehicleId") vehicleId: string) {
    return this.ev.getBatteryState(user, vehicleId);
  }

  @Post("charging-sessions")
  @Audited({ action: "CHARGING_SESSION_LOGGED", resourceType: "ChargingSession" })
  logChargingSession(@CurrentUser() user: AuthenticatedUser, @Param("vehicleId") vehicleId: string, @Body() dto: LogChargingSessionDto) {
    return this.ev.logChargingSession(user, vehicleId, dto);
  }

  @Get("charging-sessions")
  chargingHistory(@CurrentUser() user: AuthenticatedUser, @Param("vehicleId") vehicleId: string) {
    return this.ev.chargingHistory(user, vehicleId);
  }
}
