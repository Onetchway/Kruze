import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ComplianceScope, ComplianceSeverity, ComplianceSubjectType } from "../../../generated/prisma";

export class CreateComplianceRuleDto {
  @IsEnum(ComplianceScope)
  scope!: ComplianceScope;

  @IsOptional()
  @IsString()
  scopeOrgId?: string;

  @IsEnum(ComplianceSubjectType)
  subjectType!: ComplianceSubjectType;

  @IsString()
  docType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxExpiryGraceDays?: number;

  @IsOptional()
  @IsEnum(ComplianceSeverity)
  severity?: ComplianceSeverity;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
