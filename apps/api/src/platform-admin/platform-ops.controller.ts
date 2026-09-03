import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { SUPER_ADMIN_ROLES, SUPER_ADMIN_WRITE_ROLES, TENANT_MANAGEMENT_ROLES, PlatformRole } from "@kruze/domain";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { PlatformRelationshipsService } from "./platform-relationships.service";
import { PlatformFleetService } from "./platform-fleet.service";
import { PlatformOperationsService } from "./platform-operations.service";
import { PlatformComplianceService } from "./platform-compliance.service";
import { PlatformSettingsService } from "./platform-settings.service";
import { PlatformNotificationService } from "./platform-notification.service";
import { PlatformSupportService } from "./platform-support.service";
import { PlatformFeatureFlagService } from "./platform-feature-flag.service";
import { PlatformApiKeyService } from "./platform-api-key.service";
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from "./dto/notification-template.dto";
import {
  AddSupportCaseEventDto,
  AssignSupportCaseDto,
  ChangeSupportCaseStatusDto,
  CreateSupportCaseDto,
} from "./dto/support-case.dto";
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from "./dto/feature-flag.dto";
import { CreateApiKeyDto } from "./dto/api-key.dto";

/** Fleet block/suspend actions are a tenant-management-grade action, same role set as suspending an organisation. */
const FLEET_WRITE_ROLES = TENANT_MANAGEMENT_ROLES;

/** Feature flags / global config, per PLATFORM_PERMISSION_MATRIX's "Platform configuration" row. */
const FEATURE_FLAG_ROLES = [PlatformRole.KRUZE_SUPER_ADMIN, PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_OPERATIONS_ADMIN];

/** API keys, per PLATFORM_PERMISSION_MATRIX's "Operations monitoring... manage integrations" row. */
const API_KEY_ROLES = FEATURE_FLAG_ROLES;

@Controller("platform/relationships")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformRelationshipsController {
  constructor(private readonly service: PlatformRelationshipsService) {}

  @Get()
  list(@Query("type") type?: string, @Query("status") status?: string, @Query("organisationId") organisationId?: string) {
    return this.service.list({ type, status, organisationId });
  }

  @Get("summary")
  summary() {
    return this.service.summary();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }
}

@Controller("platform/fleet")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformFleetController {
  constructor(private readonly service: PlatformFleetService) {}

  @Get("summary")
  summary() {
    return this.service.summary();
  }

  @Get("drivers")
  drivers(@Query("q") q?: string, @Query("status") status?: string, @Query("vendorOrgId") vendorOrgId?: string) {
    return this.service.listDrivers({ q, status, vendorOrgId });
  }

  @Get("vehicles")
  vehicles(@Query("q") q?: string, @Query("status") status?: string, @Query("vendorOrgId") vendorOrgId?: string) {
    return this.service.listVehicles({ q, status, vendorOrgId });
  }

  @Get("guards")
  guards(@Query("q") q?: string, @Query("status") status?: string, @Query("vendorOrgId") vendorOrgId?: string) {
    return this.service.listGuards({ q, status, vendorOrgId });
  }

  @Post("drivers/:id/block")
  @Roles(...FLEET_WRITE_ROLES)
  @Audited({ action: "DRIVER_BLOCKED", resourceType: "Driver" })
  blockDriver(@Param("id") id: string) {
    return this.service.blockDriver(id);
  }

  @Post("drivers/:id/suspend")
  @Roles(...FLEET_WRITE_ROLES)
  @Audited({ action: "DRIVER_SUSPENDED", resourceType: "Driver" })
  suspendDriver(@Param("id") id: string) {
    return this.service.suspendDriver(id);
  }

  @Post("drivers/:id/unblock")
  @Roles(...FLEET_WRITE_ROLES)
  @Audited({ action: "DRIVER_UNBLOCKED", resourceType: "Driver" })
  unblockDriver(@Param("id") id: string) {
    return this.service.unblockDriver(id);
  }

  @Post("vehicles/:id/block")
  @Roles(...FLEET_WRITE_ROLES)
  @Audited({ action: "VEHICLE_BLOCKED", resourceType: "Vehicle" })
  blockVehicle(@Param("id") id: string) {
    return this.service.blockVehicle(id);
  }

  @Post("vehicles/:id/unblock")
  @Roles(...FLEET_WRITE_ROLES)
  @Audited({ action: "VEHICLE_UNBLOCKED", resourceType: "Vehicle" })
  unblockVehicle(@Param("id") id: string) {
    return this.service.unblockVehicle(id);
  }

  @Post("guards/:id/block")
  @Roles(...FLEET_WRITE_ROLES)
  @Audited({ action: "GUARD_BLOCKED", resourceType: "Guard" })
  blockGuard(@Param("id") id: string) {
    return this.service.blockGuard(id);
  }

  @Post("guards/:id/unblock")
  @Roles(...FLEET_WRITE_ROLES)
  @Audited({ action: "GUARD_UNBLOCKED", resourceType: "Guard" })
  unblockGuard(@Param("id") id: string) {
    return this.service.unblockGuard(id);
  }
}

@Controller("platform/operations")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformOperationsController {
  constructor(private readonly service: PlatformOperationsService) {}

  @Get("overview")
  overview() {
    return this.service.overview();
  }

  @Get("trips")
  trips(
    @Query("status") status?: string,
    @Query("corporateOrgId") corporateOrgId?: string,
    @Query("vendorOrgId") vendorOrgId?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.listTrips({ status, corporateOrgId, vendorOrgId, cursor, limit: limit ? Number(limit) : undefined });
  }
}

@Controller("platform/compliance")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformComplianceController {
  constructor(private readonly service: PlatformComplianceService) {}

  @Get("overview")
  overview() {
    return this.service.overview();
  }

  @Get("safety-policies")
  safetyPolicies() {
    return this.service.listSafetyPolicies();
  }
}

@Controller("platform/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get("planning-weights")
  getPlanningWeights() {
    return this.service.getPlanningWeights();
  }

  @Put("planning-weights")
  @Roles(PlatformRole.KRUZE_SUPER_ADMIN, PlatformRole.PLATFORM_OWNER)
  @Audited({ action: "PLANNING_WEIGHTS_UPDATED", resourceType: "PlatformSetting" })
  setPlanningWeights(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, number>) {
    return this.service.setPlanningWeights(body, user.userId);
  }

  @Get("branding")
  getBranding() {
    return this.service.getBranding();
  }

  @Put("branding")
  @Roles(PlatformRole.KRUZE_SUPER_ADMIN, PlatformRole.PLATFORM_OWNER)
  @Audited({ action: "PLATFORM_BRANDING_UPDATED", resourceType: "PlatformSetting" })
  setBranding(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.service.setBranding(body, user.userId);
  }
}

@Controller("platform/notification-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformNotificationController {
  constructor(private readonly service: PlatformNotificationService) {}

  @Get()
  list(@Query("category") category?: string, @Query("active") active?: string) {
    return this.service.list({ category, active });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }

  @Post()
  @Roles(...SUPER_ADMIN_WRITE_ROLES)
  @Audited({ action: "NOTIFICATION_TEMPLATE_CREATED", resourceType: "NotificationTemplate" })
  create(@Body() dto: CreateNotificationTemplateDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @Roles(...SUPER_ADMIN_WRITE_ROLES)
  @Audited({ action: "NOTIFICATION_TEMPLATE_UPDATED", resourceType: "NotificationTemplate" })
  update(@Param("id") id: string, @Body() dto: UpdateNotificationTemplateDto) {
    return this.service.update(id, dto);
  }

  @Post(":id/deactivate")
  @Roles(...SUPER_ADMIN_WRITE_ROLES)
  @Audited({ action: "NOTIFICATION_TEMPLATE_DEACTIVATED", resourceType: "NotificationTemplate" })
  deactivate(@Param("id") id: string) {
    return this.service.deactivate(id);
  }

  @Post(":id/activate")
  @Roles(...SUPER_ADMIN_WRITE_ROLES)
  @Audited({ action: "NOTIFICATION_TEMPLATE_ACTIVATED", resourceType: "NotificationTemplate" })
  activate(@Param("id") id: string) {
    return this.service.activate(id);
  }
}

@Controller("platform/support-cases")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformSupportController {
  constructor(private readonly service: PlatformSupportService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("priority") priority?: string,
    @Query("organisationId") organisationId?: string,
  ) {
    return this.service.list({ status, category, priority, organisationId });
  }

  @Get("summary")
  summary() {
    return this.service.summary();
  }

  @Get(":seq")
  get(@Param("seq", ParseIntPipe) seq: number) {
    return this.service.get(seq);
  }

  @Post()
  @Roles(...SUPER_ADMIN_WRITE_ROLES)
  @Audited({ action: "SUPPORT_CASE_CREATED", resourceType: "SupportCase" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupportCaseDto) {
    return this.service.create(dto, user.userId);
  }

  @Post(":seq/status")
  @Roles(...SUPER_ADMIN_WRITE_ROLES)
  @Audited({ action: "SUPPORT_CASE_STATUS_CHANGED", resourceType: "SupportCase" })
  changeStatus(@Param("seq", ParseIntPipe) seq: number, @CurrentUser() user: AuthenticatedUser, @Body() dto: ChangeSupportCaseStatusDto) {
    return this.service.changeStatus(seq, dto, user.userId);
  }

  @Post(":seq/assign")
  @Roles(...SUPER_ADMIN_WRITE_ROLES)
  @Audited({ action: "SUPPORT_CASE_ASSIGNED", resourceType: "SupportCase" })
  assign(@Param("seq", ParseIntPipe) seq: number, @CurrentUser() user: AuthenticatedUser, @Body() dto: AssignSupportCaseDto) {
    return this.service.assign(seq, dto, user.userId);
  }

  @Post(":seq/events")
  @Roles(...SUPER_ADMIN_WRITE_ROLES)
  @Audited({ action: "SUPPORT_CASE_EVENT_ADDED", resourceType: "SupportCaseEvent" })
  addEvent(@Param("seq", ParseIntPipe) seq: number, @CurrentUser() user: AuthenticatedUser, @Body() dto: AddSupportCaseEventDto) {
    return this.service.addEvent(seq, dto, user.userId);
  }
}

@Controller("platform/feature-flags")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformFeatureFlagController {
  constructor(private readonly service: PlatformFeatureFlagService) {}

  @Get()
  list(@Query("organisationId") organisationId?: string) {
    return this.service.list({ organisationId });
  }

  @Post()
  @Roles(...FEATURE_FLAG_ROLES)
  @Audited({ action: "FEATURE_FLAG_CREATED", resourceType: "FeatureFlag" })
  create(@Body() dto: CreateFeatureFlagDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @Roles(...FEATURE_FLAG_ROLES)
  @Audited({ action: "FEATURE_FLAG_UPDATED", resourceType: "FeatureFlag" })
  update(@Param("id") id: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.service.update(id, dto);
  }

  @Post(":id/toggle")
  @Roles(...FEATURE_FLAG_ROLES)
  @Audited({ action: "FEATURE_FLAG_TOGGLED", resourceType: "FeatureFlag" })
  toggle(@Param("id") id: string) {
    return this.service.toggle(id);
  }
}

@Controller("platform/api-keys")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...API_KEY_ROLES)
export class PlatformApiKeyController {
  constructor(private readonly service: PlatformApiKeyService) {}

  @Get()
  list(@Query("organisationId") organisationId?: string) {
    return this.service.list({ organisationId });
  }

  @Post()
  @Audited({ action: "API_KEY_CREATED", resourceType: "ApiKey" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiKeyDto) {
    return this.service.create(dto, user.userId);
  }

  @Post(":id/revoke")
  @Audited({ action: "API_KEY_REVOKED", resourceType: "ApiKey" })
  revoke(@Param("id") id: string) {
    return this.service.revoke(id);
  }
}
