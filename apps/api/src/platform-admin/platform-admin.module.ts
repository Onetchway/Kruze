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
  PlatformNotificationController,
  PlatformSupportController,
  PlatformFeatureFlagController,
  PlatformApiKeyController,
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
import { PlatformNotificationService } from "./platform-notification.service";
import { PlatformSupportService } from "./platform-support.service";
import { PlatformFeatureFlagService } from "./platform-feature-flag.service";
import { PlatformApiKeyService } from "./platform-api-key.service";
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
    PlatformNotificationController,
    PlatformSupportController,
    PlatformFeatureFlagController,
    PlatformApiKeyController,
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
    PlatformNotificationService,
    PlatformSupportService,
    PlatformFeatureFlagService,
    PlatformApiKeyService,
  ],
})
export class PlatformAdminModule {}
