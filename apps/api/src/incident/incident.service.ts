import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { NotificationService } from "../notification/notification.service";
import { TripService } from "../trip/trip.service";
import { canTransition } from "../trip/trip-state-machine";
import { IncidentCategory, IncidentSeverity } from "../../generated/prisma";

@Injectable()
export class IncidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly trips: TripService,
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

    if (input.category === "SOS" && input.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: input.tripId } });
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
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) {
      throw new NotFoundException("Incident not found");
    }
    if (incident.status === "CLOSED") {
      throw new ForbiddenException("Incident is already closed");
    }
    return this.prisma.incident.update({
      where: { id: incidentId },
      data: { status: "CLOSED", correctiveAction, closedByUserId: actor.userId, closedAt: new Date() },
    });
  }

  list(status?: string) {
    return this.prisma.incident.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
}
