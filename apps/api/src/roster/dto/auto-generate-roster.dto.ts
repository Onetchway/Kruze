import { IsBoolean, IsOptional, IsString } from "class-validator";

/** Auto-generate roster entries for every active employee's own default shift, across a date range. */
export class AutoGenerateRosterDto {
  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsOptional()
  @IsBoolean()
  weekdaysOnly?: boolean;
}
