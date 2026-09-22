import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SUPER_ADMIN_ROLES } from "@kruze/domain";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { PlatformSearchService } from "./platform-search.service";

/** Global Search (spec §65) — open to every Super Admin role; per-type visibility is enforced inside the service. */
@Controller("platform/search")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformSearchController {
  constructor(private readonly service: PlatformSearchService) {}

  @Get()
  search(@CurrentUser() user: AuthenticatedUser, @Query("q") q: string) {
    return this.service.search(user.role, q ?? "");
  }
}
