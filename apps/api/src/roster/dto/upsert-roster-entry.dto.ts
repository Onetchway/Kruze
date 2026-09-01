import { IsDateString, IsEnum, IsString } from "class-validator";
import { RosterEntryStatus } from "../../../generated/prisma";

export class UpsertRosterEntryDto {
  @IsString()
  employeeId!: string;

  @IsString()
  shiftId!: string;

  @IsDateString()
  date!: string;

  @IsEnum(RosterEntryStatus)
  status!: RosterEntryStatus;
}
