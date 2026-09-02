import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pickupWindowMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cutoffMinutesBeforeStart?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRideTimeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  transportRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  nightShift?: boolean;

  @IsOptional()
  @IsString()
  safetyPolicyId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
