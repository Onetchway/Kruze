import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { IncidentCategory, IncidentSeverity } from "../../../generated/prisma";

export class ReportIncidentDto {
  @IsOptional()
  @IsString()
  tripId?: string;

  @IsEnum(IncidentCategory)
  category!: IncidentCategory;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  location?: Record<string, unknown>;
}
