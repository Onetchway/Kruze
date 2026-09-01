import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
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

  async ingest(
    actor: AuthenticatedUser,
    input: {
      tripId?: string;
      driverId?: string;
      vehicleId?: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      source?: string;
      recordedAt: string;
    },
  ) {
    if (!input.tripId && !input.vehicleId && !input.driverId) {
      throw new BadRequestException("At least one of tripId, vehicleId, driverId is required");
    }
    if (input.tripId) {
      await this.assertTripAccess(actor, input.tripId);
    }
    if (input.vehicleId) {
      await this.assertVehicleAccess(actor, input.vehicleId);
    }
    if (input.driverId) {
      await this.assertDriverAccess(actor, input.driverId);
    }

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

  async latestForVehicle(actor: AuthenticatedUser, vehicleId: string) {
    await this.assertVehicleAccess(actor, vehicleId);
    return this.prisma.locationEvent.findFirst({
      where: { vehicleId },
      orderBy: { recordedAt: "desc" },
    });
  }

  async latestForTrip(actor: AuthenticatedUser, tripId: string) {
    await this.assertTripAccess(actor, tripId);
    return this.prisma.locationEvent.findFirst({
      where: { tripId },
      orderBy: { recordedAt: "desc" },
    });
  }

  async historyForTrip(actor: AuthenticatedUser, tripId: string, limit = 200) {
    await this.assertTripAccess(actor, tripId);
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

  private async assertTripAccess(actor: AuthenticatedUser, tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException("Trip not found");
    }
    if (trip.corporateOrgId !== actor.organisationId && trip.vendorOrgId !== actor.organisationId) {
      throw new ForbiddenException("Not a party to this trip");
    }
  }

  private async assertVehicleAccess(actor: AuthenticatedUser, vehicleId: string) {
    const relationship = await this.prisma.vehicleVendorRelationship.findFirst({
      where: { vehicleId, vendorOrgId: actor.organisationId, status: "ACTIVE" },
    });
    if (!relationship) {
      throw new ForbiddenException("Not the vendor for this vehicle");
    }
  }

  private async assertDriverAccess(actor: AuthenticatedUser, driverId: string) {
    const relationship = await this.prisma.driverVendorRelationship.findFirst({
      where: { driverId, vendorOrgId: actor.organisationId, status: "ACTIVE" },
    });
    if (!relationship) {
      throw new ForbiddenException("Not the vendor for this driver");
    }
  }
}
