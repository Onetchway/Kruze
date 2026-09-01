import { Module } from "@nestjs/common";
import { PlanningService } from "./planning.service";
import { PlanningController } from "./planning.controller";
import { RosterModule } from "../roster/roster.module";
import { ComplianceModule } from "../compliance/compliance.module";
import { SafetyModule } from "../safety/safety.module";
import { TripModule } from "../trip/trip.module";

@Module({
  imports: [RosterModule, ComplianceModule, SafetyModule, TripModule],
  providers: [PlanningService],
  controllers: [PlanningController],
  exports: [PlanningService],
})
export class PlanningModule {}
