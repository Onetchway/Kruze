import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { ApiOperation } from "@nestjs/swagger";
import { DriverService } from "./driver.service";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { ClaimDriverAccountDto } from "./dto/claim-driver-account.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("drivers")
export class DriverController {
  constructor(private readonly drivers: DriverService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PlatformRole.VENDOR_ADMIN, PlatformRole.FLEET_OPERATOR_ADMIN)
  @Audited({ action: "DRIVER_CREATED", resourceType: "Driver" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDriverDto) {
    return this.drivers.createForVendor(user.organisationId, dto);
  }

  /** Public: a driver already onboarded by a vendor sets up their own mobile login. */
  @Post("claim-account")
  @ApiOperation({ security: [] })
  claimAccount(@Body() dto: ClaimDriverAccountDto) {
    return this.drivers.claimAccount(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.drivers.getOwnProfile(user);
  }

  @Get("me/trips/today")
  @UseGuards(JwtAuthGuard)
  myTripsToday(@CurrentUser() user: AuthenticatedUser) {
    return this.drivers.myTripsToday(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.drivers.listForVendor(user.organisationId);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.drivers.getForOrganisation(user, id);
  }
}
