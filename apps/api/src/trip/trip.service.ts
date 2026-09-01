import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { ComplianceService } from "../compliance/compliance.service";
import { canTransition } from "./trip-state-machine";
import { AssignmentSource, TripStatus } from "../../generated/prisma";

const DEFAULT_TRIP_WINDOW_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class TripService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceService,
  ) {}

  async create(
    actor: AuthenticatedUser,
    input: {
      shiftId: string;
      scheduledStartAt: string;
      scheduledEndAt?: string;
      vendorOrgId?: string;
      contractId?: string;
      planId?: string;
      employeeIds: string[];
    },
  ) {
    const existingCount = await this.prisma.trip.count();
    const globalTripId = `KZ-TRP-${String(existingCount + 1).padStart(8, "0")}`;

    const employees = await this.prisma.employee.findMany({ where: { id: { in: input.employeeIds } } });
    if (employees.length !== input.employeeIds.length) {
      throw new BadRequestException("One or more employees not found");
    }
    if (employees.some((e) => e.corporateOrgId !== actor.organisationId)) {
      throw new BadRequestException("All employees must belong to the requesting corporate");
    }

    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          globalTripId,
          corporateOrgId: actor.organisationId,
          vendorOrgId: input.vendorOrgId,
          contractId: input.contractId,
          planId: input.planId,
          shiftId: input.shiftId,
          scheduledStartAt: new Date(input.scheduledStartAt),
          scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : undefined,
          status: "CREATED",
          employees: {
            create: input.employeeIds.map((employeeId) => ({ employeeId, status: "PLANNED" })),
          },
        },
        include: { employees: true },
      });

      await tx.tripEvent.create({
        data: { tripId: trip.id, type: "TRIP_CREATED", actorUserId: actor.userId },
      });

      return trip;
    });
  }

  async transition(actor: AuthenticatedUser, tripId: string, toStatus: TripStatus, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        throw new NotFoundException("Trip not found");
      }
      if (trip.corporateOrgId !== actor.organisationId && trip.vendorOrgId !== actor.organisationId) {
        throw new BadRequestException("Not a party to this trip");
      }
      if (!canTransition(trip.status, toStatus)) {
        throw new BadRequestException(`Invalid transition ${trip.status} -> ${toStatus}`);
      }

      const updated = await tx.trip.update({
        where: { id: tripId, version: trip.version },
        data: {
          status: toStatus,
          version: { increment: 1 },
          actualStartAt: toStatus === "RUNNING" && !trip.actualStartAt ? new Date() : undefined,
          actualEndAt: toStatus === "COMPLETED" ? new Date() : undefined,
        },
      });

      await tx.tripEvent.create({
        data: {
          tripId,
          type: `TRIP_${toStatus}`,
          actorUserId: actor.userId,
          metadata: reason ? { reason } : undefined,
        },
      });

      return updated;
    });
  }

  /**
   * Assigns driver/vehicle/guard to a trip. Checks (in order): compliance
   * eligibility, then no conflicting ACTIVE assignment for the same
   * resource on an overlapping trip window — a driver/vehicle/guard can
   * never be double-booked, including across different vendors.
   */
  async assign(
    actor: AuthenticatedUser,
    tripId: string,
    input: { driverId?: string; vehicleId?: string; guardId?: string; source?: AssignmentSource; overrideReason?: string },
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException("Trip not found");
    }
    if (trip.corporateOrgId !== actor.organisationId && trip.vendorOrgId !== actor.organisationId) {
      throw new BadRequestException("Not a party to this trip");
    }

    const windowStart = trip.scheduledStartAt;
    const windowEnd = trip.scheduledEndAt ?? new Date(trip.scheduledStartAt.getTime() + DEFAULT_TRIP_WINDOW_MS);

    if (input.driverId) {
      await this.assertEligible("DRIVER", input.driverId, trip.vendorOrgId ?? undefined, trip.corporateOrgId);
      await this.assertNoConflict("driverId", input.driverId, tripId, windowStart, windowEnd);
    }
    if (input.vehicleId) {
      await this.assertEligible("VEHICLE", input.vehicleId, trip.vendorOrgId ?? undefined, trip.corporateOrgId);
      await this.assertNoConflict("vehicleId", input.vehicleId, tripId, windowStart, windowEnd);
    }
    if (input.guardId) {
      await this.assertEligible("GUARD", input.guardId, trip.vendorOrgId ?? undefined, trip.corporateOrgId);
      await this.assertNoConflict("guardId", input.guardId, tripId, windowStart, windowEnd);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.tripAssignment.updateMany({
        where: { tripId, status: "ACTIVE" },
        data: { status: "SUPERSEDED" },
      });

      const assignment = await tx.tripAssignment.create({
        data: {
          tripId,
          driverId: input.driverId,
          vehicleId: input.vehicleId,
          guardId: input.guardId,
          source: input.source ?? "MANUAL",
          overrideReason: input.overrideReason,
        },
      });

      if (canTransition(trip.status, "RESOURCES_ASSIGNED")) {
        await tx.trip.update({
          where: { id: tripId, version: trip.version },
          data: { status: "RESOURCES_ASSIGNED", version: { increment: 1 } },
        });
      }

      await tx.tripEvent.create({
        data: {
          tripId,
          type: "RESOURCES_ASSIGNED",
          actorUserId: actor.userId,
          metadata: { driverId: input.driverId, vehicleId: input.vehicleId, guardId: input.guardId, source: input.source },
        },
      });

      return assignment;
    });
  }

  async get(actor: AuthenticatedUser, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { employees: true, assignments: { where: { status: "ACTIVE" } }, events: { orderBy: { createdAt: "desc" } } },
    });
    if (!trip) {
      throw new NotFoundException("Trip not found");
    }
    if (trip.corporateOrgId !== actor.organisationId && trip.vendorOrgId !== actor.organisationId) {
      throw new NotFoundException("Trip not found");
    }
    return trip;
  }

  listForOrganisation(organisationId: string) {
    return this.prisma.trip.findMany({
      where: { OR: [{ corporateOrgId: organisationId }, { vendorOrgId: organisationId }] },
      orderBy: { scheduledStartAt: "desc" },
      take: 100,
    });
  }

  private async assertEligible(
    subjectType: "DRIVER" | "VEHICLE" | "GUARD",
    subjectId: string,
    vendorOrgId: string | undefined,
    corporateOrgId: string,
  ) {
    const eligible = await this.compliance.isEligible(subjectType, subjectId, { vendorOrgId, corporateOrgId });
    if (!eligible) {
      throw new ConflictException(`${subjectType} ${subjectId} is not compliance-eligible for assignment`);
    }
  }

  private async assertNoConflict(
    field: "driverId" | "vehicleId" | "guardId",
    resourceId: string,
    excludingTripId: string,
    windowStart: Date,
    windowEnd: Date,
  ) {
    const conflict = await this.prisma.tripAssignment.findFirst({
      where: {
        [field]: resourceId,
        status: "ACTIVE",
        tripId: { not: excludingTripId },
        trip: {
          status: { notIn: ["CANCELLED", "COMPLETED", "FAILED", "NO_SHOW"] },
          scheduledStartAt: { lt: windowEnd },
          OR: [{ scheduledEndAt: null }, { scheduledEndAt: { gt: windowStart } }],
        },
      },
    });
    if (conflict) {
      throw new ConflictException(`${field} ${resourceId} is already assigned to an overlapping trip`);
    }
  }
}
