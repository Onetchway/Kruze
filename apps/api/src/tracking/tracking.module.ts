import { Module } from "@nestjs/common";
import { TrackingService } from "./tracking.service";
import { TrackingController, GeofenceController } from "./tracking.controller";

@Module({
  providers: [TrackingService],
  controllers: [TrackingController, GeofenceController],
  exports: [TrackingService],
})
export class TrackingModule {}
