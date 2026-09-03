import { Module } from "@nestjs/common";
import {
  PlatformRolePermissionsController,
  PlatformDashboardController,
  PlatformUserController,
  PlatformAuditController,
  PlatformSecurityController,
} from "./platform-admin.controller";
import {
  PlatformRelationshipsController,
  PlatformFleetController,
  PlatformOperationsController,
  PlatformComplianceController,
  PlatformSettingsController,
} from "./platform-ops.controller";
import { PlatformDashboardService } from "./platform-dashboard.service";
import { PlatformUserService } from "./platform-user.service";
import { PlatformAuditService } from "./platform-audit.service";
import { PlatformSecurityService } from "./platform-security.service";
import { PlatformRelationshipsService } from "./platform-relationships.service";
import { PlatformFleetService } from "./platform-fleet.service";
import { PlatformOperationsService } from "./platform-operations.service";
import { PlatformComplianceService } from "./platform-compliance.service";
import { PlatformSettingsService } from "./platform-settings.service";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  controllers: [
    PlatformRolePermissionsController,
    PlatformDashboardController,
    PlatformUserController,
    PlatformAuditController,
    PlatformSecurityController,
    PlatformRelationshipsController,
    PlatformFleetController,
    PlatformOperationsController,
    PlatformComplianceController,
    PlatformSettingsController,
  ],
  providers: [
    PlatformDashboardService,
    PlatformUserService,
    PlatformAuditService,
    PlatformSecurityService,
    PlatformRelationshipsService,
    PlatformFleetService,
    PlatformOperationsService,
    PlatformComplianceService,
    PlatformSettingsService,
  ],
})
export class PlatformAdminModule {}
