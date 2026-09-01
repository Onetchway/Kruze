import { IsObject, IsOptional, IsString } from "class-validator";

export class CreateApprovalRequestDto {
  @IsString()
  workflowType!: string;

  @IsString()
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
