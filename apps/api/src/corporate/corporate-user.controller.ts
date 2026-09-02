import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { CorporateUserService } from "./corporate-user.service";
import { InviteCorporateUserDto } from "./dto/invite-corporate-user.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("corporate/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN)
export class CorporateUserController {
  constructor(private readonly corporateUsers: CorporateUserService) {}

  @Get()
  @Roles(
    PlatformRole.CORPORATE_TRANSPORT_ADMIN,
    PlatformRole.CORPORATE_TRANSPORT_MANAGER,
    PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR,
    PlatformRole.CORPORATE_MANAGEMENT,
    PlatformRole.CORPORATE_HR,
    PlatformRole.CORPORATE_FINANCE,
    PlatformRole.CORPORATE_SAFETY_COMPLIANCE,
    PlatformRole.AUDITOR,
  )
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.corporateUsers.listMembers(user.organisationId);
  }

  @Post()
  @Audited({ action: "CORPORATE_USER_INVITED", resourceType: "OrganisationMembership" })
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteCorporateUserDto) {
    return this.corporateUsers.invite(user, dto);
  }

  @Post(":membershipId/suspend")
  @Audited({ action: "CORPORATE_USER_SUSPENDED", resourceType: "OrganisationMembership" })
  suspend(@CurrentUser() user: AuthenticatedUser, @Param("membershipId") membershipId: string) {
    return this.corporateUsers.setStatus(user, membershipId, "SUSPENDED");
  }

  @Post(":membershipId/reactivate")
  @Audited({ action: "CORPORATE_USER_REACTIVATED", resourceType: "OrganisationMembership" })
  reactivate(@CurrentUser() user: AuthenticatedUser, @Param("membershipId") membershipId: string) {
    return this.corporateUsers.setStatus(user, membershipId, "ACTIVE");
  }
}
