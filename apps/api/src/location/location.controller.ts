import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { LocationService } from "./location.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";

const LOCATION_WRITE_ROLES = [
  PlatformRole.CORPORATE_TRANSPORT_ADMIN,
  PlatformRole.CORPORATE_TRANSPORT_MANAGER,
  PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR,
];

@Controller("locations")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...LOCATION_WRITE_ROLES)
export class LocationController {
  constructor(private readonly locations: LocationService) {}

  @Get()
  @Roles(
    PlatformRole.CORPORATE_TRANSPORT_ADMIN,
    PlatformRole.CORPORATE_TRANSPORT_MANAGER,
    PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR,
    PlatformRole.CORPORATE_MANAGEMENT,
    PlatformRole.CORPORATE_HR,
  )
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.locations.listForOrganisation(user.organisationId);
  }

  @Post()
  @Audited({ action: "LOCATION_CREATED", resourceType: "Location" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLocationDto) {
    return this.locations.create(user.organisationId, dto);
  }

  @Delete(":id")
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_TRANSPORT_MANAGER)
  @Audited({ action: "LOCATION_DEACTIVATED", resourceType: "Location" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.locations.remove(user.organisationId, id);
  }
}
