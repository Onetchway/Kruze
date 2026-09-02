import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TENANT_MANAGEMENT_ROLES, SUPER_ADMIN_ROLES } from "@kruze/domain";
import { OrganisationService } from "./organisation.service";
import { CreateOrganisationDto } from "./dto/create-organisation.dto";
import { AdminCreateOrganisationDto } from "./dto/admin-create-organisation.dto";
import { UpdateOrganisationProfileDto } from "./dto/update-organisation-profile.dto";
import { SuspendOrganisationDto } from "./dto/suspend-organisation.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";

@Controller("organisations")
export class OrganisationController {
  constructor(private readonly organisations: OrganisationService) {}

  /** Public onboarding request — the organisation starts PENDING_APPROVAL. */
  @Post()
  @Audited({ action: "ORGANISATION_ONBOARDING_REQUESTED", resourceType: "Organisation" })
  requestOnboarding(@Body() dto: CreateOrganisationDto) {
    return this.organisations.requestOnboarding(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SUPER_ADMIN_ROLES)
  list() {
    return this.organisations.list();
  }

  /** Super Admin tenant creation (spec §7) — created ACTIVE directly. */
  @Post("admin-create")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TENANT_MANAGEMENT_ROLES)
  @Audited({ action: "ORGANISATION_ADMIN_CREATED", resourceType: "Organisation" })
  adminCreate(@Body() dto: AdminCreateOrganisationDto) {
    return this.organisations.adminCreate(dto);
  }

  /** Any authenticated user may resolve a Kruze ID to invite that organisation into a relationship. */
  @Get("lookup")
  @UseGuards(JwtAuthGuard)
  lookup(@Query("globalOrgId") globalOrgId: string) {
    return this.organisations.findByGlobalId(globalOrgId);
  }

  /** The caller's own organisation — mainly so a UI can display "your Kruze ID" for others to connect to. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.organisations.findById(user.organisationId);
  }

  @Post(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TENANT_MANAGEMENT_ROLES)
  @Audited({ action: "ORGANISATION_APPROVED", resourceType: "Organisation" })
  approve(@Param("id") id: string) {
    return this.organisations.approve(id);
  }

  /** Tenant detail (Overview tab). */
  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SUPER_ADMIN_ROLES)
  detail(@Param("id") id: string) {
    return this.organisations.findById(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TENANT_MANAGEMENT_ROLES)
  @Audited({ action: "ORGANISATION_PROFILE_UPDATED", resourceType: "Organisation" })
  updateProfile(@Param("id") id: string, @Body() dto: UpdateOrganisationProfileDto) {
    return this.organisations.updateProfile(id, dto);
  }

  @Get(":id/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SUPER_ADMIN_ROLES)
  stats(@Param("id") id: string) {
    return this.organisations.getStats(id);
  }

  @Get(":id/users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SUPER_ADMIN_ROLES)
  users(@Param("id") id: string) {
    return this.organisations.listUsers(id);
  }

  @Get(":id/relationships")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SUPER_ADMIN_ROLES)
  relationships(@Param("id") id: string) {
    return this.organisations.listRelationships(id);
  }

  @Post(":id/suspend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TENANT_MANAGEMENT_ROLES)
  @Audited({ action: "ORGANISATION_SUSPENDED", resourceType: "Organisation" })
  suspend(@Param("id") id: string, @Body() dto: SuspendOrganisationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.organisations.suspend(id, user.userId, dto.reason);
  }

  @Post(":id/reactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...TENANT_MANAGEMENT_ROLES)
  @Audited({ action: "ORGANISATION_REACTIVATED", resourceType: "Organisation" })
  reactivate(@Param("id") id: string) {
    return this.organisations.reactivate(id);
  }
}
