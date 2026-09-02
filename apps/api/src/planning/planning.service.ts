import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { RosterService } from "../roster/roster.service";
import { ShiftService } from "../roster/shift.service";
import { ComplianceService } from "../compliance/compliance.service";
import { SafetyService } from "../safety/safety.service";
import { TripService } from "../trip/trip.service";
import { NotificationService } from "../notification/notification.service";
import { MaintenanceService } from "../maintenance/maintenance.service";
import { clusterByProximity, orderRouteByDistance } from "./geo-routing";
import { OptimizerClient } from "./optimizer-client";
import { ExceptionType } from "../../generated/prisma";

const DEFAULT_GROUP_SIZE = 6;

interface EligibleDemandEmployee {
  employeeId: string;
  gender?: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * The automation-first daily loop (spec §8/§9): demand -> grouping ->
 * eligible-vendor/resource filtering -> compliance -> safety hard
 * constraints -> auto allocation -> exceptions -> plan. This is a
 * deterministic heuristic, not an exact vehicle-routing solver — the spec
 * explicitly allows starting with a simpler solver/heuristic and
 * upgrading later (§17: "initially OR-Tools-based solver ... or routing
 * provider matrices"). It IS geography-aware, though: grouping clusters
 * employees by home-location proximity (nearest-neighbor clustering) and
 * each group's stop order is a nearest-neighbor + 2-opt route (see
 * geo-routing.ts) rather than arbitrary roster order — both degrade to
 * the old behavior (fixed-size chunking / roster order) if a corporate
 * hasn't captured employee home coordinates.
 *
 * When every employee in the shift's demand has home coordinates, this
 * first tries the real OR-Tools CVRP solver (apps/optimizer-service,
 * via OptimizerClient) to jointly solve grouping AND stop order in one
 * optimization — a genuine solver, not a heuristic. That service being
 * unreachable, slow, or unable to find a solution silently falls back
 * to the clusterByProximity/orderRouteByDistance heuristic above, so a
 * plan generation is never blocked by it.
 */
@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roster: RosterService,
    private readonly shifts: ShiftService,
    private readonly compliance: ComplianceService,
    private readonly safety: SafetyService,
    private readonly trips: TripService,
    private readonly notifications: NotificationService,
    private readonly maintenance: MaintenanceService,
    private readonly optimizer: OptimizerClient,
  ) {}

  async generate(actor: AuthenticatedUser, input: { shiftId: string; planDate: string }) {
    const shift = await this.shifts.get(input.shiftId);
    if (shift.corporateOrgId !== actor.organisationId) {
      throw new NotFoundException("Shift not found in this corporate");
    }

    const previousPlan = await this.prisma.transportPlan.findFirst({
      where: { corporateOrgId: actor.organisationId, shiftId: input.shiftId, planDate: new Date(input.planDate) },
      orderBy: { version: "desc" },
    });

    const plan = await this.prisma.transportPlan.create({
      data: {
        corporateOrgId: actor.organisationId,
        shiftId: input.shiftId,
        planDate: new Date(input.planDate),
        version: (previousPlan?.version ?? 0) + 1,
        supersedesPlanId: previousPlan?.id,
        status: "OPTIMIZING",
      },
    });

    const demand = await this.roster.listDemand(input.shiftId, input.planDate);
    const vendorOrgIds = await this.eligibleVendorOrgIds(actor.organisationId);

    const demandPoints: EligibleDemandEmployee[] = demand.map((d) => ({
      employeeId: d.employeeId,
      gender: d.employee.gender,
      latitude: d.employee.homeLatitude,
      longitude: d.employee.homeLongitude,
    }));
    const groups = await this.groupAndRoute(demandPoints);

    let tripsCreated = 0;
    let exceptionsRaised = 0;
    let guardsAssigned = 0;
    let unassignedEmployees = 0;

    for (const group of groups) {
      const outcome = await this.planGroup(actor, plan.id, shift, input.planDate, group, vendorOrgIds);
      if (outcome.tripId) {
        tripsCreated += 1;
        if (outcome.guardAssigned) guardsAssigned += 1;
      } else {
        exceptionsRaised += 1;
        unassignedEmployees += group.length;
      }
    }

    const finalStatus = exceptionsRaised > 0 ? "EXCEPTIONS" : demand.length > 0 ? "READY" : "READY";
    const updatedPlan = await this.prisma.transportPlan.update({
      where: { id: plan.id },
      data: {
        status: finalStatus,
        metadata: {
          employeesRequiringTransport: demand.length,
          tripsGenerated: tripsCreated,
          exceptionsRaised,
          vehiclesRequired: tripsCreated,
          driversRequired: tripsCreated,
          guardsRequired: guardsAssigned,
          unassignedEmployees,
        },
      },
    });

    if (previousPlan && previousPlan.status !== "SUPERSEDED") {
      await this.prisma.transportPlan.update({ where: { id: previousPlan.id }, data: { status: "SUPERSEDED" } });
    }

    return updatedPlan;
  }

  /** Never overwrite a published plan — publish only from a clean, exception-free plan. */
  async publish(actor: AuthenticatedUser, planId: string) {
    const plan = await this.prisma.transportPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException("Plan not found");
    }
    if (plan.corporateOrgId !== actor.organisationId) {
      throw new BadRequestException("Not this corporate's plan");
    }
    const openExceptions = await this.prisma.planException.count({ where: { planId, status: "OPEN" } });
    if (openExceptions > 0) {
      throw new BadRequestException(`Cannot publish: ${openExceptions} unresolved exception(s)`);
    }
    if (plan.status !== "READY" && plan.status !== "EXCEPTIONS") {
      throw new BadRequestException(`Plan is not publishable from status ${plan.status}`);
    }

    const alreadyPublished = await this.prisma.transportPlan.findFirst({
      where: { corporateOrgId: plan.corporateOrgId, shiftId: plan.shiftId, planDate: plan.planDate, status: "PUBLISHED" },
    });
    if (alreadyPublished && alreadyPublished.id !== planId) {
      await this.prisma.transportPlan.update({ where: { id: alreadyPublished.id }, data: { status: "SUPERSEDED" } });
    }

    const trips = await this.prisma.trip.findMany({ where: { planId } });
    for (const trip of trips) {
      if (trip.status === "CREATED") {
        await this.trips.transition(actor, trip.id, "SCHEDULED");
      }
    }

    await this.notifications.send({
      event: "PLAN_PUBLISHED",
      channel: "PUSH",
      templateKey: "plan_published",
      recipientType: "CORPORATE_ADMIN",
      recipientId: actor.organisationId,
      payload: { planId, tripCount: trips.length },
    });

    return this.prisma.transportPlan.update({ where: { id: planId }, data: { status: "PUBLISHED" } });
  }

  exceptionsForPlan(planId: string) {
    return this.prisma.planException.findMany({ where: { planId }, orderBy: { createdAt: "asc" } });
  }

  /** Every exception across every one of this corporate's plans — the triage inbox, not one plan at a time. */
  exceptionsForCorporate(corporateOrgId: string, status?: string) {
    return this.prisma.planException.findMany({
      where: {
        status: status ? (status as never) : undefined,
        plan: { corporateOrgId },
      },
      include: { plan: { include: { shift: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  /**
   * Tries the real OR-Tools CVRP solver first (only meaningful when every
   * employee has home coordinates); falls back to the clusterByProximity
   * + orderRouteByDistance heuristic otherwise or on any solver failure.
   */
  private async groupAndRoute(demandPoints: EligibleDemandEmployee[]): Promise<EligibleDemandEmployee[][]> {
    const hasAllCoordinates = demandPoints.length > 0 && demandPoints.every((d) => d.latitude !== null && d.longitude !== null);
    if (hasAllCoordinates) {
      const depot = centroid(demandPoints as Array<{ latitude: number; longitude: number }>);
      const routes = await this.optimizer.solveCvrp(
        depot,
        demandPoints.map((d) => ({ id: d.employeeId, latitude: d.latitude!, longitude: d.longitude! })),
        DEFAULT_GROUP_SIZE,
      );
      if (routes) {
        this.logger.log(`OR-Tools solved ${routes.length} route(s) for ${demandPoints.length} employee(s)`);
        const byEmployeeId = new Map(demandPoints.map((d) => [d.employeeId, d]));
        return routes.map((route) => route.stopIds.map((id) => byEmployeeId.get(id)!));
      }
    }
    return clusterByProximity(demandPoints, DEFAULT_GROUP_SIZE);
  }

  private async eligibleVendorOrgIds(corporateOrgId: string): Promise<string[]> {
    const relationships = await this.prisma.organisationRelationship.findMany({
      where: { type: "CORPORATE_VENDOR", status: "ACTIVE", OR: [{ sourceOrgId: corporateOrgId }, { targetOrgId: corporateOrgId }] },
    });
    return relationships.map((r) => (r.sourceOrgId === corporateOrgId ? r.targetOrgId : r.sourceOrgId));
  }

  private async planGroup(
    actor: AuthenticatedUser,
    planId: string,
    shift: { id: string; startTime: string },
    planDate: string,
    group: EligibleDemandEmployee[],
    vendorOrgIds: string[],
  ): Promise<{ tripId?: string; guardAssigned?: boolean }> {
    const scheduledStartAt = shiftStartAt(new Date(planDate), shift.startTime);
    // Route the group's stops by distance so "last passenger" (used by the
    // LAST_DROP_RESTRICTION safety rule below) reflects an actual pickup
    // order, not arbitrary roster order.
    group = orderRouteByDistance(group);

    for (const vendorOrgId of vendorOrgIds) {
      const vehicle = await this.findEligibleVehicle(vendorOrgId, group.length, actor.organisationId, scheduledStartAt);
      if (!vehicle) {
        continue;
      }
      const driver = await this.findEligibleDriver(vendorOrgId, actor.organisationId, scheduledStartAt);
      if (!driver) {
        continue;
      }

      const safetyResult = await this.safety.evaluateRoute({
        corporateOrgId: actor.organisationId,
        scheduledDropAt: scheduledStartAt,
        employees: group.map((g, idx) => ({
          employeeId: g.employeeId,
          gender: g.gender,
          isFinalPassenger: idx === group.length - 1,
        })),
        hasGuardAssigned: false,
        rideTimeMinutes: 30,
      });

      let guardId: string | undefined;
      const guardMandatoryViolation = safetyResult.violations.find((v) => v.ruleType === "GUARD_REQUIRED" && v.mandatory);
      if (guardMandatoryViolation) {
        const guard = await this.findEligibleGuard(vendorOrgId, actor.organisationId, scheduledStartAt);
        if (!guard) {
          await this.raiseException(planId, "NO_GUARD_AVAILABLE", { vendorOrgId, groupSize: group.length });
          continue;
        }
        guardId = guard.id;
      } else if (!safetyResult.passed) {
        await this.raiseException(planId, "SAFETY_RULE_IMPOSSIBLE", { vendorOrgId, violations: safetyResult.violations });
        continue;
      }

      const trip = await this.trips.create(actor, {
        shiftId: shift.id,
        scheduledStartAt: scheduledStartAt.toISOString(),
        vendorOrgId,
        planId,
        employeeIds: group.map((g) => g.employeeId),
      });

      await this.trips.assign(actor, trip.id, {
        driverId: driver.id,
        vehicleId: vehicle.id,
        guardId,
        source: "AUTO",
      });

      return { tripId: trip.id, guardAssigned: Boolean(guardId) };
    }

    await this.raiseException(planId, "NO_ELIGIBLE_VEHICLE", { groupSize: group.length, vendorsTried: vendorOrgIds.length });
    return {};
  }

  private async raiseException(planId: string, type: ExceptionType, context: unknown) {
    await this.prisma.planException.create({ data: { planId, type, context: context as never } });
  }

  private async findEligibleVehicle(vendorOrgId: string, minCapacity: number, corporateOrgId: string, at: Date) {
    const candidates = await this.prisma.vehicle.findMany({
      where: {
        status: "ACTIVE",
        capacity: { gte: minCapacity },
        vendorRelationships: { some: { vendorOrgId, status: "ACTIVE" } },
      },
    });
    for (const candidate of candidates) {
      const eligible = await this.compliance.isEligible("VEHICLE", candidate.id, { vendorOrgId, corporateOrgId });
      if (!eligible) continue;
      const blocked = await this.maintenance.isDeploymentBlocked(candidate.id);
      if (blocked) continue;
      const busy = await this.isBusy("vehicleId", candidate.id, at);
      if (!busy) return candidate;
    }
    return null;
  }

  private async findEligibleDriver(vendorOrgId: string, corporateOrgId: string, at: Date) {
    const candidates = await this.prisma.driver.findMany({
      where: { status: "ACTIVE", vendorRelationships: { some: { vendorOrgId, status: "ACTIVE" } } },
    });
    for (const candidate of candidates) {
      const eligible = await this.compliance.isEligible("DRIVER", candidate.id, { vendorOrgId, corporateOrgId });
      if (!eligible) continue;
      const busy = await this.isBusy("driverId", candidate.id, at);
      if (!busy) return candidate;
    }
    return null;
  }

  private async findEligibleGuard(vendorOrgId: string, corporateOrgId: string, at: Date) {
    const candidates = await this.prisma.guard.findMany({
      where: { status: "ACTIVE", vendorRelationships: { some: { vendorOrgId, status: "ACTIVE" } } },
    });
    for (const candidate of candidates) {
      const eligible = await this.compliance.isEligible("GUARD", candidate.id, { vendorOrgId, corporateOrgId });
      if (!eligible) continue;
      const busy = await this.isBusy("guardId", candidate.id, at);
      if (!busy) return candidate;
    }
    return null;
  }

  private async isBusy(field: "driverId" | "vehicleId" | "guardId", resourceId: string, at: Date): Promise<boolean> {
    const windowMs = 2 * 60 * 60 * 1000;
    const conflict = await this.prisma.tripAssignment.findFirst({
      where: {
        [field]: resourceId,
        status: "ACTIVE",
        trip: {
          status: { notIn: ["CANCELLED", "COMPLETED", "FAILED", "NO_SHOW"] },
          scheduledStartAt: { lt: new Date(at.getTime() + windowMs) },
          OR: [{ scheduledEndAt: null }, { scheduledEndAt: { gt: at } }],
        },
      },
    });
    return Boolean(conflict);
  }
}

function shiftStartAt(date: Date, startTime: string): Date {
  const [hours, minutes] = startTime.split(":").map(Number);
  const start = new Date(date);
  start.setUTCHours(hours, minutes, 0, 0);
  return start;
}

/** Simple mean-position depot for the CVRP solve — there's no corporate "office" coordinate in the schema today. */
function centroid(points: Array<{ latitude: number; longitude: number }>): { latitude: number; longitude: number } {
  const sum = points.reduce((acc, p) => ({ latitude: acc.latitude + p.latitude, longitude: acc.longitude + p.longitude }), {
    latitude: 0,
    longitude: 0,
  });
  return { latitude: sum.latitude / points.length, longitude: sum.longitude / points.length };
}
