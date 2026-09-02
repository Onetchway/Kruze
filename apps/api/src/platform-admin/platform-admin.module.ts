import { Module } from "@nestjs/common";
import {
  PlatformRolePermissionsController,
  PlatformDashboardController,
  PlatformUserController,
  PlatformAuditController,
  PlatformSecurityController,
} from "./platform-admin.controller";
import { PlatformDashboardService } from "./platform-dashboard.service";
import { PlatformUserService } from "./platform-user.service";
import { PlatformAuditService } from "./platform-audit.service";
import { PlatformSecurityService } from "./platform-security.service";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  controllers: [
    PlatformRolePermissionsController,
    PlatformDashboardController,
    PlatformUserController,
    PlatformAuditController,
    PlatformSecurityController,
  ],
  providers: [PlatformDashboardService, PlatformUserService, PlatformAuditService, PlatformSecurityService],
})
export class PlatformAdminModule {}
