import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class EmployeeSignupDto {
  @IsString()
  @MinLength(1)
  globalOrgId!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  department?: string;
}
