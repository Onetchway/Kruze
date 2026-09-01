import { Module } from "@nestjs/common";
import { GuardService } from "./guard.service";
import { GuardController } from "./guard.controller";

@Module({
  providers: [GuardService],
  controllers: [GuardController],
  exports: [GuardService],
})
export class GuardModule {}
