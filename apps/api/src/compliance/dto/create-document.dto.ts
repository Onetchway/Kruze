import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { ComplianceSubjectType } from "../../../generated/prisma";

export class CreateDocumentDto {
  @IsEnum(ComplianceSubjectType)
  entityType!: ComplianceSubjectType;

  @IsString()
  entityId!: string;

  @IsString()
  docType!: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
