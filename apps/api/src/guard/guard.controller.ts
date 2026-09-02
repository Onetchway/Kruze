import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { ApiOperation } from "@nestjs/swagger";
import { GuardService } from "./guard.service";
import { CreateGuardDto } from "./dto/create-guard.dto";
import { ClaimGuardAccountDto } from "./dto/claim-guard-account.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("guards")
export class GuardController {
  constructor(private readonly guards: GuardService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PlatformRole.VENDOR_ADMIN, PlatformRole.FLEET_OPERATOR_ADMIN)
  @Audited({ action: "GUARD_CREATED", resourceType: "Guard" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGuardDto) {
    return this.guards.createForVendor(user.organisationId, dto);
  }

  /** Public: a guard already onboarded by a vendor sets up their own mobile login. */
  @Post("claim-account")
  @ApiOperation({ security: [] })
  claimAccount(@Body() dto: ClaimGuardAccountDto) {
    return this.guards.claimAccount(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.guards.getOwnProfile(user);
  }

  @Get("me/trips/today")
  @UseGuards(JwtAuthGuard)
  myTripsToday(@CurrentUser() user: AuthenticatedUser) {
    return this.guards.myTripsToday(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.guards.listForVendor(user.organisationId);
  }

  /** For a corporate: guards authorized via its connected vendors. */
  @Get("network")
  @UseGuards(JwtAuthGuard)
  listNetwork(@CurrentUser() user: AuthenticatedUser) {
    return this.guards.listForCorporateNetwork(user.organisationId);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.guards.getForOrganisation(user, id);
  }
}
