import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { NotificationService } from "../notification/notification.service";
import { TripService } from "../trip/trip.service";
import { canTransition } from "../trip/trip-state-machine";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { IncidentCategory, IncidentSeverity } from "../../generated/prisma";

@Injectable()
export class IncidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly trips: TripService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async report(
    actor: AuthenticatedUser,
    input: { tripId?: string; category: IncidentCategory; severity?: IncidentSeverity; description?: string; location?: unknown },
  ) {
    const incident = await this.prisma.incident.create({
      data: {
        tripId: input.tripId,
        category: input.category,
        severity: input.severity ?? "MEDIUM",
        reportedByUserId: actor.userId,
        description: input.description,
        location: input.location as never,
      },
    });

    const trip = input.tripId ? await this.prisma.trip.findUnique({ where: { id: input.tripId } }) : null;
    if (trip) {
      const payload = { incidentId: incident.id, tripId: input.tripId, category: incident.category, severity: incident.severity };
      this.realtime.emitToOrg(trip.corporateOrgId, "incident.created", payload);
      this.realtime.emitToOrg(trip.vendorOrgId, "incident.created", payload);
    }

    if (input.category === "SOS" && input.tripId) {
      if (trip && canTransition(trip.status, "SOS_ACTIVE")) {
        await this.trips.transition(actor, input.tripId, "SOS_ACTIVE", "SOS raised");
      }
      await this.notifications.send({
        event: "SOS_RAISED",
        channel: "PUSH",
        templateKey: "sos_raised",
        recipientType: "CONTROL_ROOM",
        payload: { incidentId: incident.id, tripId: input.tripId },
        tripId: input.tripId,
      });
    }

    return incident;
  }

  updateStatus(incidentId: string, status: "OPEN" | "INVESTIGATING" | "ACTION_TAKEN" | "CLOSED") {
    return this.prisma.incident.update({ where: { id: incidentId }, data: { status } });
  }

  async close(actor: AuthenticatedUser, incidentId: string, correctiveAction: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId }, include: { trip: true } });
    if (!incident) {
      throw new NotFoundException("Incident not found");
    }
    if (!this.canAccess(actor, incident)) {
      throw new NotFoundException("Incident not found");
    }
    if (incident.status === "CLOSED") {
      throw new ForbiddenException("Incident is already closed");
    }
    const closed = await this.prisma.incident.update({
      where: { id: incidentId },
      data: { status: "CLOSED", correctiveAction, closedByUserId: actor.userId, closedAt: new Date() },
    });
    if (incident.trip) {
      const payload = { incidentId, tripId: incident.tripId };
      this.realtime.emitToOrg(incident.trip.corporateOrgId, "incident.closed", payload);
      this.realtime.emitToOrg(incident.trip.vendorOrgId, "incident.closed", payload);
    }
    return closed;
  }

  list(actor: AuthenticatedUser, status?: string) {
    return this.prisma.incident.findMany({
      where: {
        status: status ? (status as never) : undefined,
        ...(actor.role === "KRUZE_SUPER_ADMIN"
          ? {}
          : {
              OR: [
                { trip: { corporateOrgId: actor.organisationId } },
                { trip: { vendorOrgId: actor.organisationId } },
                { tripId: null, reportedByUserId: actor.userId },
              ],
            }),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  private canAccess(actor: AuthenticatedUser, incident: { tripId: string | null; reportedByUserId: string | null; trip: { corporateOrgId: string; vendorOrgId: string | null } | null }) {
    if (actor.role === "KRUZE_SUPER_ADMIN") {
      return true;
    }
    if (incident.trip) {
      return incident.trip.corporateOrgId === actor.organisationId || incident.trip.vendorOrgId === actor.organisationId;
    }
    return incident.reportedByUserId === actor.userId;
  }
}
