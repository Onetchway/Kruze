import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { LocationService } from "./location.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { CreateLocationRequestDto } from "./dto/create-location-request.dto";
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
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locations: LocationService) {}

  @Get()
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
  @Roles(...LOCATION_WRITE_ROLES)
  @Audited({ action: "LOCATION_CREATED", resourceType: "Location" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLocationDto) {
    return this.locations.create(user.organisationId, dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(...LOCATION_WRITE_ROLES)
  @Audited({ action: "LOCATION_UPDATED", resourceType: "Location" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateLocationDto) {
    return this.locations.update(user.organisationId, id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_TRANSPORT_MANAGER)
  @Audited({ action: "LOCATION_DEACTIVATED", resourceType: "Location" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.locations.remove(user.organisationId, id);
  }

  // -- New-location approval queue --

  @Post("requests")
  @Audited({ action: "LOCATION_REQUEST_CREATED", resourceType: "ApprovalRequest" })
  requestLocation(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLocationRequestDto) {
    return this.locations.requestLocation(user, user.organisationId, dto);
  }

  @Get("requests")
  @UseGuards(RolesGuard)
  @Roles(...LOCATION_WRITE_ROLES)
  listRequests(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: string) {
    return this.locations.listLocationRequests(user.organisationId, status);
  }

  @Post("requests/:id/approve")
  @UseGuards(RolesGuard)
  @Roles(...LOCATION_WRITE_ROLES)
  @Audited({ action: "LOCATION_REQUEST_APPROVED", resourceType: "ApprovalRequest" })
  approveRequest(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.locations.approveLocationRequest(user, user.organisationId, id);
  }

  @Post("requests/:id/reject")
  @UseGuards(RolesGuard)
  @Roles(...LOCATION_WRITE_ROLES)
  @Audited({ action: "LOCATION_REQUEST_REJECTED", resourceType: "ApprovalRequest" })
  rejectRequest(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: { reason?: string }) {
    return this.locations.rejectLocationRequest(user, user.organisationId, id, body?.reason);
  }
}
