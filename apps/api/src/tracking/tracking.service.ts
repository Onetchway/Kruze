import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { KafkaProducerService } from "../eventbus/kafka-producer.service";
import { TRACKING_EVENTS_TOPIC } from "../eventbus/topics";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  /**
   * Live-safety telemetry signals for a corporate's currently-running
   * trips: overspeed (a raw LocationEvent above the threshold in the last
   * hour), GPS-offline (no LocationEvent at all in the last 15 minutes for
   * a trip that should be reporting), delayed (running/en-route past its
   * expected completion window), and a coarse route-deviation signal (the
   * vehicle's latest point is unreasonably far from every planned stop on
   * its own trip — a radius check, not true planned-path tracking, which
   * this schema doesn't store).
   */
  async liveSafetySummary(corporateOrgId: string) {
    const OVERSPEED_THRESHOLD_KMH = 80;
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const fifteenMinAgo = new Date(now - 15 * 60 * 1000);

    const runningTrips = await this.prisma.trip.findMany({
      where: { corporateOrgId, status: { in: ["RUNNING", "EN_ROUTE_TO_FIRST_PICKUP"] } },
      select: { id: true, scheduledStartAt: true, scheduledEndAt: true, stops: { select: { latitude: true, longitude: true } } },
    });
    const runningTripIds = runningTrips.map((t) => t.id);
    const delayedCount = runningTrips.filter((t) => this.isDelayed(t)).length;

    if (runningTripIds.length === 0) {
      return { overspeedCount: 0, gpsOfflineCount: 0, runningTrips: 0, delayedCount: 0, routeDeviationCount: 0 };
    }

    const overspeedEvents = await this.prisma.locationEvent.findMany({
      where: { tripId: { in: runningTripIds }, recordedAt: { gte: oneHourAgo }, speed: { gt: OVERSPEED_THRESHOLD_KMH / 3.6 } },
      distinct: ["tripId"],
      select: { tripId: true },
    });

    const recentlyReportingTripIds = await this.prisma.locationEvent.findMany({
      where: { tripId: { in: runningTripIds }, recordedAt: { gte: fifteenMinAgo } },
      distinct: ["tripId"],
      select: { tripId: true },
    });
    const reportingSet = new Set(recentlyReportingTripIds.map((e) => e.tripId));
    const gpsOfflineCount = runningTripIds.filter((id) => !reportingSet.has(id)).length;

    const routeDeviationCount = await this.countRouteDeviations(runningTrips);

    return { overspeedCount: overspeedEvents.length, gpsOfflineCount, runningTrips: runningTripIds.length, delayedCount, routeDeviationCount };
  }

  /**
   * A trip is "delayed" once now passes its scheduled start plus expected
   * duration and it hasn't finished. Expected duration uses scheduledEndAt
   * when set; otherwise a fixed 90-minute buffer (no better duration
   * signal exists on Trip/TripStop without a routing engine).
   */
  private isDelayed(trip: { scheduledStartAt: Date; scheduledEndAt: Date | null }): boolean {
    const DEFAULT_BUFFER_MS = 90 * 60 * 1000;
    const expectedEnd = trip.scheduledEndAt ?? new Date(trip.scheduledStartAt.getTime() + DEFAULT_BUFFER_MS);
    return Date.now() > expectedEnd.getTime();
  }

  /**
   * Coarse, honest deviation signal: for each running trip with planned
   * stops, take its latest location point and check whether it's within a
   * generous radius of ANY of that trip's own stops. Flags only the
   * unambiguous case (nowhere near any planned stop) — not a substitute
   * for real planned-path tracking.
   */
  private async countRouteDeviations(
    runningTrips: { id: string; stops: { latitude: number; longitude: number }[] }[],
  ): Promise<number> {
    const DEVIATION_RADIUS_METERS = 3000;
    const tripsWithStops = runningTrips.filter((t) => t.stops.length > 0);
    if (tripsWithStops.length === 0) return 0;

    let count = 0;
    for (const trip of tripsWithStops) {
      const latest = await this.prisma.locationEvent.findFirst({
        where: { tripId: trip.id },
        orderBy: { recordedAt: "desc" },
      });
      if (!latest) continue;
      const minDistance = Math.min(
        ...trip.stops.map((s) => haversineDistanceMeters({ latitude: s.latitude, longitude: s.longitude }, latest)),
      );
      if (minDistance > DEVIATION_RADIUS_METERS) {
        count += 1;
      }
    }
    return count;
  }

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
    let trip: { corporateOrgId: string; vendorOrgId: string | null } | null = null;
    if (input.tripId) {
      trip = await this.assertTripAccess(actor, input.tripId);
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

    const event = await this.prisma.locationEvent.create({
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

    if (input.tripId && trip) {
      const payload = { tripId: input.tripId, latitude: input.latitude, longitude: input.longitude, speed: input.speed, recordedAt: event.recordedAt };
      this.kafka.publish(TRACKING_EVENTS_TOPIC, input.tripId, "trip.location", [trip.corporateOrgId, trip.vendorOrgId], payload);
    }

    return event;
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
    return trip;
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
