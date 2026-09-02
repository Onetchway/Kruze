import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { SafetyRuleType } from "../../generated/prisma";

export interface RouteEmployeeContext {
  employeeId: string;
  gender?: string | null;
  isFinalPassenger: boolean;
}

export interface RouteEvaluationInput {
  corporateOrgId: string;
  tripId?: string;
  scheduledDropAt: Date;
  employees: RouteEmployeeContext[];
  hasGuardAssigned: boolean;
  rideTimeMinutes: number;
}

export interface SafetyViolation {
  ruleType: SafetyRuleType;
  mandatory: boolean;
  message: string;
}

export interface RouteEvaluationResult {
  passed: boolean;
  violations: SafetyViolation[];
}

/**
 * Safety is deliberately configurable, never a hard-coded universal rule
 * (spec §11 / §20): a corporate with no active SafetyPolicy simply has no
 * constraints applied. When configured, a mandatory rule's violation is a
 * hard constraint the planning/allocation engine must respect — reject and
 * re-route, or block guard-less publication.
 */
@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  createPolicy(corporateOrgId: string, name: string) {
    return this.prisma.safetyPolicy.create({ data: { corporateOrgId, name } });
  }

  /**
   * Today's guard/escort coverage: trips with an active guard assignment
   * ("assigned"), plus NO_GUARD_AVAILABLE plan exceptions for today's
   * plans ("exceptions") — required is the sum of both, mirroring how the
   * planner itself only ever knows a guard was needed when it either
   * assigned one or gave up looking for one.
   */
  async guardEscortSummary(corporateOrgId: string, date: string) {
    const dayStart = new Date(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const [assigned, exceptions] = await Promise.all([
      this.prisma.tripAssignment.count({
        where: {
          status: "ACTIVE",
          guardId: { not: null },
          trip: { corporateOrgId, scheduledStartAt: { gte: dayStart, lt: dayEnd } },
        },
      }),
      this.prisma.planException.count({
        where: {
          type: "NO_GUARD_AVAILABLE",
          plan: { corporateOrgId, planDate: { gte: dayStart, lt: dayEnd } },
        },
      }),
    ]);

    return { required: assigned + exceptions, assigned, exceptions };
  }

  listPolicies(corporateOrgId: string) {
    return this.prisma.safetyPolicy.findMany({
      where: { corporateOrgId },
      include: { rules: true },
      orderBy: { version: "desc" },
    });
  }

  async addRule(actor: AuthenticatedUser, policyId: string, input: { type: SafetyRuleType; config: unknown; mandatory?: boolean }) {
    const policy = await this.prisma.safetyPolicy.findUnique({ where: { id: policyId } });
    if (!policy) {
      throw new NotFoundException("Safety policy not found");
    }
    if (policy.corporateOrgId !== actor.organisationId) {
      throw new ForbiddenException("Not authorized to modify another corporate's safety policy");
    }
    return this.prisma.safetyRule.create({
      data: {
        policyId,
        type: input.type,
        config: input.config as never,
        mandatory: input.mandatory ?? true,
      },
    });
  }

  async evaluateRoute(input: RouteEvaluationInput): Promise<RouteEvaluationResult> {
    const policy = await this.prisma.safetyPolicy.findFirst({
      where: { corporateOrgId: input.corporateOrgId, active: true },
      include: { rules: true },
      orderBy: { version: "desc" },
    });

    const violations: SafetyViolation[] = [];

    if (policy) {
      for (const rule of policy.rules) {
        const config = (rule.config ?? {}) as Record<string, unknown>;

        if (rule.type === "LAST_DROP_RESTRICTION") {
          const afterHour = Number(config.afterHour ?? 24);
          const appliesToGender = String(config.appliesToGender ?? "");
          const dropHour = input.scheduledDropAt.getUTCHours();
          if (dropHour >= afterHour) {
            const restricted = input.employees.some(
              (e) => e.isFinalPassenger && e.gender && e.gender.toUpperCase() === appliesToGender.toUpperCase(),
            );
            if (restricted) {
              violations.push({
                ruleType: rule.type,
                mandatory: rule.mandatory,
                message: `Employee of restricted gender cannot be final passenger after ${afterHour}:00`,
              });
            }
          }
        }

        if (rule.type === "GUARD_REQUIRED") {
          const afterHour = config.afterHour !== undefined ? Number(config.afterHour) : undefined;
          const dropHour = input.scheduledDropAt.getUTCHours();
          const applies = afterHour === undefined || dropHour >= afterHour;
          if (applies && !input.hasGuardAssigned) {
            violations.push({
              ruleType: rule.type,
              mandatory: rule.mandatory,
              message: "Trip requires an eligible guard/escort but none is assigned",
            });
          }
        }

        if (rule.type === "MAX_RIDE_TIME") {
          const maxMinutes = Number(config.maxMinutes ?? Infinity);
          if (input.rideTimeMinutes > maxMinutes) {
            violations.push({
              ruleType: rule.type,
              mandatory: rule.mandatory,
              message: `Ride time ${input.rideTimeMinutes}m exceeds maximum ${maxMinutes}m`,
            });
          }
        }
      }
    }

    await this.prisma.safetyEvent.createMany({
      data: violations.map((v) => ({
        tripId: input.tripId,
        type: v.ruleType,
        severity: v.mandatory ? "HIGH" : "LOW",
        status: v.mandatory ? "REJECTED" : "WARNING",
        policyVersion: policy?.version,
        inputContext: input as never,
        outcome: v.message,
      })),
    });

    const passed = violations.every((v) => !v.mandatory);
    return { passed, violations };
  }
}
