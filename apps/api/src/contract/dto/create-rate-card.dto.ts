import { IsDateString, IsObject, IsOptional, IsString } from "class-validator";

export class CreateRateCardDto {
  @IsString()
  vehicleType!: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsString()
  pricingModel!: string;

  @IsObject()
  pricingRules!: Record<string, unknown>;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
