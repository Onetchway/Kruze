import { IsOptional, IsString } from "class-validator";

export class ReportBreakdownDto {
  @IsOptional()
  @IsString()
  description?: string;
}

export class ReplaceResourceDto {
  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;
}
