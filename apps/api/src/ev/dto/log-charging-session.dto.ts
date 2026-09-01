import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class LogChargingSessionDto {
  @IsDateString()
  startedAt!: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  startSocPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  endSocPercent?: number;

  @IsOptional()
  @IsNumber()
  energyKwh?: number;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  location?: string;
}
