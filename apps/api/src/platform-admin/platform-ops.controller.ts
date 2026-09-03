import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { SUPER_ADMIN_ROLES, TENANT_MANAGEMENT_ROLES, PlatformRole } from "@kruze/domain";
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

/** Fleet block/suspend actions are a tenant-management-grade action, same role set as suspending an organisation. */
const FLEET_WRITE_ROLES = TENANT_MANAGEMENT_ROLES;

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
