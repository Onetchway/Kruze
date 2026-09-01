import { IsString, MinLength } from "class-validator";

export class OverrideOtpDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
