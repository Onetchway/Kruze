import { IsNumber, IsOptional, IsString } from "class-validator";

export class CompleteMaintenanceDto {
  @IsOptional()
  @IsNumber()
  odometerKm?: number;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
