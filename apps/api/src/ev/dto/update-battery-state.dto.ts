import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateBatteryStateDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  socPercent!: number;

  @IsOptional()
  @IsNumber()
  estimatedRangeKm?: number;

  @IsOptional()
  @IsString()
  chargingStatus?: string;
}
