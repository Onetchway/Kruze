import { IsArray, IsBoolean, IsEmail, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

/** Partial edit of an employee's own profile fields — never touches status/eligibility (see separate actions). */
export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  costCentre?: string;

  @IsOptional()
  @IsNumber()
  homeLatitude?: number;

  @IsOptional()
  @IsNumber()
  homeLongitude?: number;

  @IsOptional()
  @IsString()
  officeLabel?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  pickupLocationId?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRequirements?: string[];
}
