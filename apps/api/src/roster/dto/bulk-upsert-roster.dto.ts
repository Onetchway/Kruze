import { ArrayMinSize, IsArray, IsDateString, IsString } from "class-validator";

export class BulkUpsertRosterDto {
  @IsString()
  shiftId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  employeeIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsDateString({}, { each: true })
  dates!: string[];
}
