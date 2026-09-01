import { Module } from "@nestjs/common";
import { MaintenanceService } from "./maintenance.service";
import { MaintenanceController, MaintenanceRecordController } from "./maintenance.controller";

@Module({
  providers: [MaintenanceService],
  controllers: [MaintenanceController, MaintenanceRecordController],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
