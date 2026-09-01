import { Module } from "@nestjs/common";
import { DriverService } from "./driver.service";
import { DriverController } from "./driver.controller";
import { IdentityModule } from "../identity/identity.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [IdentityModule, AuthModule],
  providers: [DriverService],
  controllers: [DriverController],
  exports: [DriverService],
})
export class DriverModule {}
