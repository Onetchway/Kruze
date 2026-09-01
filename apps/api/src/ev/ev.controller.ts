import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { EvService } from "./ev.service";
import { UpdateBatteryStateDto } from "./dto/update-battery-state.dto";
import { LogChargingSessionDto } from "./dto/log-charging-session.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Audited } from "../audit/audited.decorator";

@Controller("vehicles/:vehicleId/ev")
@UseGuards(JwtAuthGuard)
export class EvController {
  constructor(private readonly ev: EvService) {}

  @Post("battery-state")
  @Audited({ action: "VEHICLE_BATTERY_STATE_UPDATED", resourceType: "VehicleBatteryState" })
  updateBatteryState(@Param("vehicleId") vehicleId: string, @Body() dto: UpdateBatteryStateDto) {
    return this.ev.updateBatteryState(vehicleId, dto);
  }

  @Get("battery-state")
  getBatteryState(@Param("vehicleId") vehicleId: string) {
    return this.ev.getBatteryState(vehicleId);
  }

  @Post("charging-sessions")
  @Audited({ action: "CHARGING_SESSION_LOGGED", resourceType: "ChargingSession" })
  logChargingSession(@Param("vehicleId") vehicleId: string, @Body() dto: LogChargingSessionDto) {
    return this.ev.logChargingSession(vehicleId, dto);
  }

  @Get("charging-sessions")
  chargingHistory(@Param("vehicleId") vehicleId: string) {
    return this.ev.chargingHistory(vehicleId);
  }
}
