import { Module } from "@nestjs/common";
import { EvService } from "./ev.service";
import { EvController } from "./ev.controller";

@Module({
  providers: [EvService],
  controllers: [EvController],
  exports: [EvService],
})
export class EvModule {}
