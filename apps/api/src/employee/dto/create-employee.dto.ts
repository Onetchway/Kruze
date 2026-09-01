import { IsEmail, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

export class CreateEmployeeDto {
  @IsString()
  employeeCode!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsString()
  phone!: string;

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
}
