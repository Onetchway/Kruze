import { Module } from "@nestjs/common";
import { GuardService } from "./guard.service";
import { GuardController } from "./guard.controller";
import { IdentityModule } from "../identity/identity.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [IdentityModule, AuthModule],
  providers: [GuardService],
  controllers: [GuardController],
  exports: [GuardService],
})
export class GuardModule {}
