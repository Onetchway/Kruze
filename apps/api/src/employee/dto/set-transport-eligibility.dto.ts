import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SetTransportEligibilityDto {
  @IsBoolean()
  transportEligible!: boolean;

  @IsOptional()
  @IsString()
  eligibilityReason?: string;
}
