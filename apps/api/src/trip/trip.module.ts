import { Module } from "@nestjs/common";
import { TripService } from "./trip.service";
import { TripController } from "./trip.controller";
import { ComplianceModule } from "../compliance/compliance.module";

@Module({
  imports: [ComplianceModule],
  providers: [TripService],
  controllers: [TripController],
  exports: [TripService],
})
export class TripModule {}
