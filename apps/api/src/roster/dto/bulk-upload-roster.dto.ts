import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsString, ValidateNested } from "class-validator";

class RosterUploadRow {
  @IsString()
  employeeCode!: string;

  @IsString()
  date!: string;

  @IsString()
  shiftId!: string;
}

/** Rows parsed client-side from an uploaded CSV/Excel roster file. */
export class BulkUploadRosterDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RosterUploadRow)
  rows!: RosterUploadRow[];
}
