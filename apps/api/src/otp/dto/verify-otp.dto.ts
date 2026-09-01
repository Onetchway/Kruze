import { IsNumber, IsOptional, IsString } from "class-validator";

export class VerifyOtpDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
