import { IsDateString, IsEmail, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateCorporateSettingsDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsDateString()
  contractStartsAt?: string;

  @IsOptional()
  @IsDateString()
  contractEndsAt?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  employeePickupChangeLimit?: number;
}
