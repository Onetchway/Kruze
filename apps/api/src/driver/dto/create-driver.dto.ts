import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  licenceNumber?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;
}
