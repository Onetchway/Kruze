import { Module } from "@nestjs/common";
import { ShiftService } from "./shift.service";
import { RosterService } from "./roster.service";
import { ShiftController, RosterController } from "./roster.controller";

@Module({
  providers: [ShiftService, RosterService],
  controllers: [ShiftController, RosterController],
  exports: [ShiftService, RosterService],
})
export class RosterModule {}
