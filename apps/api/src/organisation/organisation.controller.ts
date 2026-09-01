import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { OrganisationService } from "./organisation.service";
import { CreateOrganisationDto } from "./dto/create-organisation.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";

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
  @Roles(PlatformRole.KRUZE_SUPER_ADMIN)
  list() {
    return this.organisations.list();
  }

  @Post(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PlatformRole.KRUZE_SUPER_ADMIN)
  @Audited({ action: "ORGANISATION_APPROVED", resourceType: "Organisation" })
  approve(@Param("id") id: string) {
    return this.organisations.approve(id);
  }
}
