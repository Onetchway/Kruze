import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuditModule } from "./audit/audit.module";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { IdentityModule } from "./identity/identity.module";
import { AuthModule } from "./auth/auth.module";
import { OrganisationModule } from "./organisation/organisation.module";
import { RelationshipModule } from "./relationship/relationship.module";
import { AuthzModule } from "./authz/authz.module";
import { DriverModule } from "./driver/driver.module";
import { VehicleModule } from "./vehicle/vehicle.module";
import { GuardModule } from "./guard/guard.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { ContractModule } from "./contract/contract.module";
import { EmployeeModule } from "./employee/employee.module";
import { RosterModule } from "./roster/roster.module";
import { TripModule } from "./trip/trip.module";
import { SafetyModule } from "./safety/safety.module";
import { OtpModule } from "./otp/otp.module";
import { TrackingModule } from "./tracking/tracking.module";
import { NotificationModule } from "./notification/notification.module";
import { IncidentModule } from "./incident/incident.module";
import { BillingModule } from "./billing/billing.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { PlanningModule } from "./planning/planning.module";
import { EvModule } from "./ev/ev.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { SubscriptionModule } from "./subscription/subscription.module";
import { WorkflowModule } from "./workflow/workflow.module";
import { CorporateModule } from "./corporate/corporate.module";
import { LocationModule } from "./location/location.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    IdentityModule,
    AuthModule,
    AuthzModule,
    OrganisationModule,
    RelationshipModule,
    DriverModule,
    VehicleModule,
    GuardModule,
    ComplianceModule,
    ContractModule,
    EmployeeModule,
    RosterModule,
    TripModule,
    SafetyModule,
    OtpModule,
    TrackingModule,
    NotificationModule,
    IncidentModule,
    BillingModule,
    AnalyticsModule,
    PlanningModule,
    EvModule,
    MaintenanceModule,
    SubscriptionModule,
    WorkflowModule,
    CorporateModule,
    LocationModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
