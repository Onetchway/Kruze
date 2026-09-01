import { IsDateString, IsString } from "class-validator";

export class GeneratePlanDto {
  @IsString()
  shiftId!: string;

  @IsDateString()
  planDate!: string;
}
