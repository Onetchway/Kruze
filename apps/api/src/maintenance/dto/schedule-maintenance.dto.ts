import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { MaintenanceType } from "../../../generated/prisma";

export class ScheduleMaintenanceDto {
  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  workshop?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  blocksDeployment?: boolean;
}
