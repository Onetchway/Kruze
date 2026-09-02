import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  PLATFORM_PERMISSION_MATRIX,
  SUPER_ADMIN_ROLES,
  USER_MANAGEMENT_ROLES,
  SECURITY_ROLES,
  PlatformRole,
} from "@kruze/domain";

/** Audit log is readable by security/compliance admins and the read-only role, not just security. */
const AUDIT_VIEW_ROLES = [...SECURITY_ROLES, PlatformRole.COMPLIANCE_ADMIN, PlatformRole.READ_ONLY_SUPER_ADMIN];
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";
import { PlatformDashboardService } from "./platform-dashboard.service";
import { PlatformUserService } from "./platform-user.service";
import { PlatformAuditService } from "./platform-audit.service";
import { PlatformSecurityService } from "./platform-security.service";
import { InvitePlatformUserDto } from "./dto/invite-platform-user.dto";
import { ChangeMembershipRoleDto } from "./dto/change-membership-role.dto";

/** Not sensitive — any authenticated Super Admin may see the role/permission matrix that governs their own portal. */
@Controller("platform/role-permissions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformRolePermissionsController {
  @Get()
  list() {
    return PLATFORM_PERMISSION_MATRIX;
  }
}

@Controller("platform/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformDashboardController {
  constructor(private readonly dashboard: PlatformDashboardService) {}

  @Get()
  overview() {
    return this.dashboard.getOverview();
  }
}

@Controller("platform/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...USER_MANAGEMENT_ROLES)
export class PlatformUserController {
  constructor(private readonly platformUsers: PlatformUserService) {}

  @Get()
  list(@Query("organisationId") organisationId?: string, @Query("q") q?: string, @Query("status") status?: string) {
    return this.platformUsers.list({ organisationId, q, status });
  }

  @Post("invite")
  @Audited({ action: "PLATFORM_USER_INVITED", resourceType: "OrganisationMembership" })
  invite(@Body() dto: InvitePlatformUserDto) {
    return this.platformUsers.invite(dto);
  }

  @Post(":userId/disable")
  @Audited({ action: "PLATFORM_USER_DISABLED", resourceType: "User" })
  disable(@Param("userId") userId: string) {
    return this.platformUsers.setUserStatus(userId, "DEACTIVATED");
  }

  @Post(":userId/enable")
  @Audited({ action: "PLATFORM_USER_ENABLED", resourceType: "User" })
  enable(@Param("userId") userId: string) {
    return this.platformUsers.setUserStatus(userId, "ACTIVE");
  }

  @Patch("memberships/:membershipId/role")
  @Audited({ action: "MEMBERSHIP_ROLE_CHANGED", resourceType: "OrganisationMembership" })
  changeRole(@Param("membershipId") membershipId: string, @Body() dto: ChangeMembershipRoleDto) {
    return this.platformUsers.changeMembershipRole(membershipId, dto.role);
  }
}

@Controller("platform/audit-log")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AUDIT_VIEW_ROLES)
export class PlatformAuditController {
  constructor(private readonly auditLog: PlatformAuditService) {}

  @Get()
  list(
    @Query("organisationId") organisationId?: string,
    @Query("actorUserId") actorUserId?: string,
    @Query("action") action?: string,
    @Query("resourceType") resourceType?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.auditLog.list({
      organisationId,
      actorUserId,
      action,
      resourceType,
      from,
      to,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
}

@Controller("platform/security")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SECURITY_ROLES)
export class PlatformSecurityController {
  constructor(private readonly security: PlatformSecurityService) {}

  @Get("overview")
  overview() {
    return this.security.getOverview();
  }
}
