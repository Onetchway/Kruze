import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export enum SupportCaseCategoryDto {
  LOGIN = "LOGIN",
  OTP = "OTP",
  TRIP = "TRIP",
  GPS = "GPS",
  INTEGRATION = "INTEGRATION",
  BILLING = "BILLING",
  EMPLOYEE = "EMPLOYEE",
  DRIVER = "DRIVER",
  COMPLIANCE = "COMPLIANCE",
  PERFORMANCE = "PERFORMANCE",
  SECURITY = "SECURITY",
}

export enum SupportCasePriorityDto {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum SupportCaseStatusDto {
  OPEN = "OPEN",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  WAITING = "WAITING",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export class CreateSupportCaseDto {
  @IsOptional()
  @IsUUID()
  organisationId?: string;

  @IsOptional()
  @IsUUID()
  reportedByUserId?: string;

  @IsEnum(SupportCaseCategoryDto)
  category!: SupportCaseCategoryDto;

  @IsOptional()
  @IsEnum(SupportCasePriorityDto)
  priority?: SupportCasePriorityDto;

  @IsString()
  @MinLength(3)
  description!: string;
}

export class ChangeSupportCaseStatusDto {
  @IsEnum(SupportCaseStatusDto)
  status!: SupportCaseStatusDto;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignSupportCaseDto {
  @IsUUID()
  assigneeUserId!: string;
}

export class AddSupportCaseEventDto {
  @IsString()
  @MinLength(1)
  message!: string;
}
