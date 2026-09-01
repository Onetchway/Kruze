import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { NotificationService } from "../notification/notification.service";
import { TripService } from "../trip/trip.service";
import { ComplianceService } from "../compliance/compliance.service";

/**
 * No-show and breakdown/replacement — the two "live re-optimization"
 * flows a supervisor deals with once a trip is already in motion (spec
 * §12 / §19 / §20). Replacement resource search is deliberately scoped to
 * vendor + compliance eligibility so a breakdown can never leak another
 * vendor's fleet into this vendor's trip.
 */
@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly trips: TripService,
    private readonly compliance: ComplianceService,
  ) {}

  async markNoShow(actor: AuthenticatedUser, tripEmployeeId: string, reason?: string) {
    const tripEmployee = await this.prisma.tripEmployee.findUnique({
      where: { id: tripEmployeeId },
      include: { trip: true, employee: true },
    });
    if (!tripEmployee) {
      throw new NotFoundException("Trip employee not found");
    }

    await this.prisma.tripEmployee.update({ where: { id: tripEmployeeId }, data: { status: "NO_SHOW" } });

    const incident = await this.prisma.incident.create({
      data: {
        tripId: tripEmployee.tripId,
        category: "NO_SHOW",
        severity: "LOW",
        reportedByUserId: actor.userId,
        description: reason ?? "Employee did not board within the configured wait window",
      },
    });

    await this.prisma.tripEvent.create({
      data: {
        tripId: tripEmployee.tripId,
        type: "EMPLOYEE_NO_SHOW",
        actorUserId: actor.userId,
        metadata: { tripEmployeeId, incidentId: incident.id, reason },
      },
    });

    return incident;
  }

  async reportBreakdown(actor: AuthenticatedUser, tripId: string, description?: string) {
    const trip = await this.trips.transition(actor, tripId, "BREAKDOWN", description ?? "Vehicle breakdown reported");

    const incident = await this.prisma.incident.create({
      data: {
        tripId,
        category: "BREAKDOWN",
        severity: "HIGH",
        reportedByUserId: actor.userId,
        description,
      },
    });

    await this.notifications.send({
      event: "VEHICLE_BREAKDOWN",
      channel: "PUSH",
      templateKey: "vehicle_breakdown",
      recipientType: "CONTROL_ROOM",
      payload: { tripId, incidentId: incident.id },
      tripId,
    });

    return { trip, incident };
  }

  /**
   * Finds an eligible replacement vehicle for the trip's vendor: same
   * vendor relationship, ACTIVE status, compliance-eligible, and not
   * already committed to an overlapping trip.
   */
  async findReplacementVehicle(vendorOrgId: string, excludeVehicleId: string, corporateOrgId: string) {
    const candidates = await this.prisma.vehicle.findMany({
      where: {
        id: { not: excludeVehicleId },
        status: "ACTIVE",
        vendorRelationships: { some: { vendorOrgId, status: "ACTIVE" } },
      },
      take: 20,
    });

    for (const candidate of candidates) {
      const eligible = await this.compliance.isEligible("VEHICLE", candidate.id, { vendorOrgId, corporateOrgId });
      if (!eligible) {
        continue;
      }
      const busy = await this.prisma.tripAssignment.findFirst({
        where: {
          vehicleId: candidate.id,
          status: "ACTIVE",
          trip: { status: { notIn: ["CANCELLED", "COMPLETED", "FAILED", "NO_SHOW"] } },
        },
      });
      if (!busy) {
        return candidate;
      }
    }
    return null;
  }

  async replace(actor: AuthenticatedUser, tripId: string, input: { driverId?: string; vehicleId?: string }) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException("Trip not found");
    }
    if (trip.status !== "BREAKDOWN") {
      throw new BadRequestException("Replacement is only valid for a trip in BREAKDOWN state");
    }

    await this.trips.transition(actor, tripId, "REASSIGNING", "Replacement resource located");
    const assignment = await this.trips.assign(actor, tripId, {
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      source: "REPLACEMENT",
      overrideReason: "Breakdown replacement",
    });

    await this.notifications.send({
      event: "REPLACEMENT_ASSIGNED",
      channel: "PUSH",
      templateKey: "replacement_assigned",
      recipientType: "EMPLOYEE",
      payload: { tripId, driverId: input.driverId, vehicleId: input.vehicleId },
      tripId,
    });

    return assignment;
  }
}
