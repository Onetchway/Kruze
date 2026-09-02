import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { BILLING_ROLES } from "@kruze/domain";
import { SubscriptionService } from "./subscription.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { RecordUsageDto } from "./dto/record-usage.dto";
import { ExtendTrialDto } from "./dto/extend-trial.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";

@Controller("subscription-plans")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...BILLING_ROLES)
export class SubscriptionPlanController {
  constructor(private readonly subscriptions: SubscriptionService) {}

  @Post()
  @Audited({ action: "SUBSCRIPTION_PLAN_CREATED", resourceType: "SubscriptionPlan" })
  create(@Body() dto: CreatePlanDto) {
    return this.subscriptions.createPlan(dto);
  }

  @Get()
  list() {
    return this.subscriptions.listPlans();
  }
}

@Controller("subscriptions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...BILLING_ROLES)
export class SubscriptionController {
  constructor(private readonly subscriptions: SubscriptionService) {}

  @Post()
  @Audited({ action: "SUBSCRIPTION_CREATED", resourceType: "Subscription" })
  subscribe(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptions.subscribe(dto.organisationId, dto.planId);
  }

  @Post("organisations/:organisationId/activate")
  @Audited({ action: "SUBSCRIPTION_ACTIVATED", resourceType: "Subscription" })
  activate(@Param("organisationId") organisationId: string) {
    return this.subscriptions.activate(organisationId);
  }

  @Post("organisations/:organisationId/suspend")
  @Audited({ action: "SUBSCRIPTION_SUSPENDED", resourceType: "Subscription" })
  suspend(@Param("organisationId") organisationId: string) {
    return this.subscriptions.suspend(organisationId);
  }

  @Post("organisations/:organisationId/cancel")
  @Audited({ action: "SUBSCRIPTION_CANCELLED", resourceType: "Subscription" })
  cancel(@Param("organisationId") organisationId: string) {
    return this.subscriptions.cancel(organisationId);
  }

  @Post("organisations/:organisationId/resume")
  @Audited({ action: "SUBSCRIPTION_RESUMED", resourceType: "Subscription" })
  resume(@Param("organisationId") organisationId: string) {
    return this.subscriptions.resume(organisationId);
  }

  @Post("organisations/:organisationId/extend-trial")
  @Audited({ action: "SUBSCRIPTION_TRIAL_EXTENDED", resourceType: "Subscription" })
  extendTrial(@Param("organisationId") organisationId: string, @Body() dto: ExtendTrialDto) {
    return this.subscriptions.extendTrial(organisationId, dto.days);
  }

  @Get("organisations/:organisationId")
  get(@Param("organisationId") organisationId: string) {
    return this.subscriptions.getForOrganisation(organisationId);
  }

  @Post("organisations/:organisationId/usage")
  @Audited({ action: "USAGE_RECORDED", resourceType: "UsageRecord" })
  recordUsage(@Param("organisationId") organisationId: string, @Body() dto: RecordUsageDto) {
    return this.subscriptions.recordUsage(organisationId, dto);
  }
}
