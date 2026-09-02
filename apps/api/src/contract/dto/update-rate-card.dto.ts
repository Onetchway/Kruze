import { IsObject, IsOptional, IsString } from "class-validator";

export class UpdateRateCardDto {
  @IsOptional()
  @IsString()
  pricingModel?: string;

  @IsOptional()
  @IsObject()
  pricingRules?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveTo?: string;
}
