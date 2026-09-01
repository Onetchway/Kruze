import { IsBoolean, IsEnum, IsObject, IsOptional } from "class-validator";
import { SafetyRuleType } from "../../../generated/prisma";

export class CreateSafetyRuleDto {
  @IsEnum(SafetyRuleType)
  type!: SafetyRuleType;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}
