import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { SafetyService } from "./safety.service";
import { CreateSafetyPolicyDto } from "./dto/create-safety-policy.dto";
import { CreateSafetyRuleDto } from "./dto/create-safety-rule.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("safety-policies")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PlatformRole.CORPORATE_SAFETY_COMPLIANCE, PlatformRole.CORPORATE_TRANSPORT_ADMIN)
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post()
  @Audited({ action: "SAFETY_POLICY_CREATED", resourceType: "SafetyPolicy" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSafetyPolicyDto) {
    return this.safety.createPolicy(user.organisationId, dto.name);
  }

  @Post(":id/rules")
  @Audited({ action: "SAFETY_RULE_ADDED", resourceType: "SafetyRule" })
  addRule(@CurrentUser() user: AuthenticatedUser, @Param("id") policyId: string, @Body() dto: CreateSafetyRuleDto) {
    return this.safety.addRule(user, policyId, dto);
  }
}
