import { IsDateString, IsString } from "class-validator";

export class GenerateVoucherDto {
  @IsString()
  driverId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
