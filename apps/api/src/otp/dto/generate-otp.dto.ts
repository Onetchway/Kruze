import { IsEnum, IsString } from "class-validator";
import { OtpPurpose } from "../../../generated/prisma";

export class GenerateOtpDto {
  @IsString()
  tripEmployeeId!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
