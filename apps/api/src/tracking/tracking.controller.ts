import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { TrackingService } from "./tracking.service";
import { IngestLocationDto } from "./dto/ingest-location.dto";
import { CreateGeofenceDto } from "./dto/create-geofence.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("tracking")
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post("locations")
  ingest(@Body() dto: IngestLocationDto) {
    return this.tracking.ingest(dto);
  }

  @Get("vehicles/:id/latest")
  latestForVehicle(@Param("id") id: string) {
    return this.tracking.latestForVehicle(id);
  }

  @Get("trips/:id/latest")
  latestForTrip(@Param("id") id: string) {
    return this.tracking.latestForTrip(id);
  }

  @Get("trips/:id/history")
  historyForTrip(@Param("id") id: string) {
    return this.tracking.historyForTrip(id);
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
