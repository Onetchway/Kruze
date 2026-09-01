import { Module } from "@nestjs/common";
import { ZoneService } from "./zone.service";
import { ZoneController } from "./zone.controller";

@Module({
  providers: [ZoneService],
  controllers: [ZoneController],
})
export class ZoneModule {}
