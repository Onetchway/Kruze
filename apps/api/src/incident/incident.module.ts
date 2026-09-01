import { Module } from "@nestjs/common";
import { IncidentService } from "./incident.service";
import { OperationsService } from "./operations.service";
import { IncidentController, SosController, TripOperationsController, NoShowController } from "./incident.controller";
import { TripModule } from "../trip/trip.module";
import { ComplianceModule } from "../compliance/compliance.module";

@Module({
  imports: [TripModule, ComplianceModule],
  providers: [IncidentService, OperationsService],
  controllers: [IncidentController, SosController, TripOperationsController, NoShowController],
  exports: [IncidentService, OperationsService],
})
export class IncidentModule {}
