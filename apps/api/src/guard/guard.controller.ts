import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { GuardService } from "./guard.service";
import { CreateGuardDto } from "./dto/create-guard.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("guards")
@UseGuards(JwtAuthGuard)
export class GuardController {
  constructor(private readonly guards: GuardService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.VENDOR_ADMIN, PlatformRole.FLEET_OPERATOR_ADMIN)
  @Audited({ action: "GUARD_CREATED", resourceType: "Guard" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGuardDto) {
    return this.guards.createForVendor(user.organisationId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.guards.listForVendor(user.organisationId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.guards.getForOrganisation(user, id);
  }
}
