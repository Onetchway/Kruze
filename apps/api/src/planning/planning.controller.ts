import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { PlanningService } from "./planning.service";
import { GeneratePlanDto } from "./dto/generate-plan.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("plans")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  PlatformRole.CORPORATE_TRANSPORT_ADMIN,
  PlatformRole.CORPORATE_TRANSPORT_MANAGER,
  PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR,
  PlatformRole.SUPERVISOR_DISPATCHER,
)
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Post("generate")
  @Audited({ action: "PLAN_GENERATED", resourceType: "TransportPlan" })
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GeneratePlanDto) {
    return this.planning.generate(user, dto);
  }

  @Get(":id/exceptions")
  exceptions(@Param("id") id: string) {
    return this.planning.exceptionsForPlan(id);
  }

  /** Cross-plan exceptions inbox for this corporate — the triage screen, not one plan at a time. */
  @Get("exceptions")
  allExceptions(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: string) {
    return this.planning.exceptionsForCorporate(user.organisationId, status);
  }

  @Post(":id/publish")
  @Audited({ action: "PLAN_PUBLISHED", resourceType: "TransportPlan" })
  publish(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.planning.publish(user, id);
  }
}
