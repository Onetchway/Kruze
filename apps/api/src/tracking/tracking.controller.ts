import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { TrackingService } from "./tracking.service";
import { IngestLocationDto } from "./dto/ingest-location.dto";
import { CreateGeofenceDto } from "./dto/create-geofence.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";

@Controller("tracking")
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post("locations")
  ingest(@CurrentUser() user: AuthenticatedUser, @Body() dto: IngestLocationDto) {
    return this.tracking.ingest(user, dto);
  }

  @Get("vehicles/:id/latest")
  latestForVehicle(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tracking.latestForVehicle(user, id);
  }

  @Get("trips/:id/latest")
  latestForTrip(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tracking.latestForTrip(user, id);
  }

  @Get("trips/:id/history")
  historyForTrip(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.tracking.historyForTrip(user, id);
  }
}

@Controller("geofences")
@UseGuards(JwtAuthGuard)
export class GeofenceController {
  constructor(private readonly tracking: TrackingService) {}

  @Post()
  create(@Body() dto: CreateGeofenceDto) {
    return this.tracking.createGeofence(dto);
  }

  @Get(":id/check")
  check(@Param("id") id: string, @Query("latitude") latitude: string, @Query("longitude") longitude: string) {
    return this.tracking.checkArrival(id, { latitude: Number(latitude), longitude: Number(longitude) });
  }
}
