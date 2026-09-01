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
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
