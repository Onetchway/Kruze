import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { VehicleService } from "./vehicle.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("vehicles")
@UseGuards(JwtAuthGuard)
export class VehicleController {
  constructor(private readonly vehicles: VehicleService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.VENDOR_ADMIN, PlatformRole.FLEET_OPERATOR_ADMIN)
  @Audited({ action: "VEHICLE_CREATED", resourceType: "Vehicle" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.createForVendor(user.organisationId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.vehicles.listForVendor(user.organisationId);
  }

  /** For a corporate: vehicles belonging to its connected vendors — not vendor-only management, read visibility. */
  @Get("network")
  listNetwork(@CurrentUser() user: AuthenticatedUser) {
    return this.vehicles.listForCorporateNetwork(user.organisationId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.vehicles.getForOrganisation(user, id);
  }
}
