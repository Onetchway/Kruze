import { IsDateString, IsObject } from "class-validator";

export class RecordUsageDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsObject()
  metrics!: Record<string, number>;
}
