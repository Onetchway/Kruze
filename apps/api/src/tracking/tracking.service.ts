import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { haversineDistanceMeters } from "./geo.util";

const FUTURE_TOLERANCE_MS = 60_000;

/**
 * Location ingestion is a separate, high-frequency path deliberately kept
 * out of the ordinary transactional CRUD flow (spec §18/§15). This
 * foundation implementation writes straight to durable storage; a
 * production deployment would front it with a queue and maintain a
 * separate latest-location cache rather than querying history for it.
 */
@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(input: {
    tripId?: string;
    driverId?: string;
    vehicleId?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    source?: string;
    recordedAt: string;
  }) {
    const recordedAt = new Date(input.recordedAt);
    if (recordedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException("recordedAt is in the future — rejecting as an impossible point");
    }

    return this.prisma.locationEvent.create({
      data: {
        tripId: input.tripId,
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        speed: input.speed,
        source: input.source ?? "DRIVER_APP",
        recordedAt,
      },
    });
  }

  latestForVehicle(vehicleId: string) {
    return this.prisma.locationEvent.findFirst({
      where: { vehicleId },
      orderBy: { recordedAt: "desc" },
    });
  }

  latestForTrip(tripId: string) {
    return this.prisma.locationEvent.findFirst({
      where: { tripId },
      orderBy: { recordedAt: "desc" },
    });
  }

  historyForTrip(tripId: string, limit = 200) {
    return this.prisma.locationEvent.findMany({
      where: { tripId },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
  }

  createGeofence(input: {
    name: string;
    type: string;
    centerLatitude: number;
    centerLongitude: number;
    radiusMeters: number;
    corporateOrgId?: string;
  }) {
    return this.prisma.geofence.create({ data: input });
  }

  /** Is the given point within the geofence's radius? Used for arrival/proof-of-service checks. */
  async checkArrival(geofenceId: string, point: { latitude: number; longitude: number }) {
    const geofence = await this.prisma.geofence.findUniqueOrThrow({ where: { id: geofenceId } });
    const distanceMeters = haversineDistanceMeters(
      { latitude: geofence.centerLatitude, longitude: geofence.centerLongitude },
      point,
    );
    return { withinGeofence: distanceMeters <= geofence.radiusMeters, distanceMeters };
  }
}
