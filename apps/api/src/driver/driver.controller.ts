import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { DriverService } from "./driver.service";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("drivers")
@UseGuards(JwtAuthGuard)
export class DriverController {
  constructor(private readonly drivers: DriverService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.VENDOR_ADMIN, PlatformRole.FLEET_OPERATOR_ADMIN)
  @Audited({ action: "DRIVER_CREATED", resourceType: "Driver" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDriverDto) {
    return this.drivers.createForVendor(user.organisationId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.drivers.listForVendor(user.organisationId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.drivers.getForOrganisation(user, id);
  }
}
