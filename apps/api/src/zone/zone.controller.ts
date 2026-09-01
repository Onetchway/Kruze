import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { ZoneService } from "./zone.service";
import { CreateZoneDto } from "./dto/create-zone.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";

@Controller("zones")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN)
export class ZoneController {
  constructor(private readonly zones: ZoneService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.zones.listForOrganisation(user.organisationId);
  }

  @Post()
  @Audited({ action: "ZONE_CREATED", resourceType: "Zone" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateZoneDto) {
    return this.zones.create(user.organisationId, dto);
  }

  @Delete(":id")
  @Audited({ action: "ZONE_DEACTIVATED", resourceType: "Zone" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zones.remove(user.organisationId, id);
  }
}
