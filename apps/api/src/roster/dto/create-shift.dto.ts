import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateShiftDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pickupWindowMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cutoffMinutesBeforeStart?: number;
}
