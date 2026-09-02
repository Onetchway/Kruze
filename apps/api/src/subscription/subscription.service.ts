import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Kruze <-> Organisation SaaS billing (plans, feature entitlements, usage
 * metering) — deliberately separate from Corporate <-> Vendor operational
 * billing in the `billing` module (spec §23). Entitlements are
 * feature/module based, never hard-coded by organisation type: a plan is
 * just a named bundle of feature keys, and a subscription can add
 * per-organisation overrides on top.
 */
@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  createPlan(input: { code: string; name: string; features: string[] }) {
    return this.prisma.subscriptionPlan.create({ data: input });
  }

  listPlans() {
    return this.prisma.subscriptionPlan.findMany({ where: { active: true } });
  }

  async subscribe(organisationId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException("Plan not found");
    }
    return this.prisma.subscription.upsert({
      where: { organisationId },
      create: { organisationId, planId, status: "TRIAL" },
      update: { planId },
    });
  }

  activate(organisationId: string) {
    return this.prisma.subscription.update({ where: { organisationId }, data: { status: "ACTIVE" } });
  }

  /** Suspend actions are reversible without re-subscribing — resume just flips status back to ACTIVE. */
  resume(organisationId: string) {
    return this.prisma.subscription.update({ where: { organisationId }, data: { status: "ACTIVE" } });
  }

  async extendTrial(organisationId: string, days: number) {
    if (days <= 0) {
      throw new BadRequestException("days must be positive");
    }
    const subscription = await this.prisma.subscription.findUnique({ where: { organisationId } });
    if (!subscription) {
      throw new NotFoundException("Organisation has no subscription");
    }
    const base = subscription.trialEndsAt && subscription.trialEndsAt > new Date() ? subscription.trialEndsAt : new Date();
    const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.update({
      where: { organisationId },
      data: { status: "TRIAL", trialEndsAt },
    });
  }

  suspend(organisationId: string) {
    return this.prisma.subscription.update({ where: { organisationId }, data: { status: "SUSPENDED" } });
  }

  cancel(organisationId: string) {
    return this.prisma.subscription.update({
      where: { organisationId },
      data: { status: "CANCELLED", endsAt: new Date() },
    });
  }

  getForOrganisation(organisationId: string) {
    return this.prisma.subscription.findUnique({ where: { organisationId }, include: { plan: true } });
  }

  async recordUsage(organisationId: string, input: { periodStart: string; periodEnd: string; metrics: Record<string, number> }) {
    const subscription = await this.prisma.subscription.findUnique({ where: { organisationId } });
    if (!subscription) {
      throw new BadRequestException("Organisation has no active subscription");
    }
    return this.prisma.usageRecord.create({
      data: {
        subscriptionId: subscription.id,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        metrics: input.metrics,
      },
    });
  }

  async listUsage(organisationId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { organisationId } });
    if (!subscription) {
      return [];
    }
    return this.prisma.usageRecord.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { periodStart: "desc" },
      take: 12,
    });
  }

  /** The entitlement check every feature-gated module should call. */
  async hasFeature(organisationId: string, featureKey: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organisationId },
      include: { plan: true },
    });
    if (!subscription || (subscription.status !== "ACTIVE" && subscription.status !== "TRIAL")) {
      return false;
    }
    return subscription.plan.features.includes(featureKey) || subscription.featureOverrides.includes(featureKey);
  }
}
