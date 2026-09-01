import { IsArray, IsDateString, IsObject, IsOptional, IsString } from "class-validator";

export class CreateContractDto {
  @IsString()
  vendorOrgId!: string;

  @IsOptional()
  @IsArray()
  scopeCities?: string[];

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsObject()
  slaTargets?: Record<string, unknown>;
}
