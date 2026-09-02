import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { CorporateService } from "./corporate.service";
import { UpdateCorporateSettingsDto } from "./dto/update-corporate-settings.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";

@Controller("corporate/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN)
export class CorporateController {
  constructor(private readonly corporate: CorporateService) {}

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
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.corporate.getSettings(user.organisationId);
  }

  @Put()
  @Audited({ action: "CORPORATE_SETTINGS_UPDATED", resourceType: "Corporate" })
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCorporateSettingsDto) {
    return this.corporate.updateSettings(user.organisationId, dto);
  }
}
