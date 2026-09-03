import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, MinLength } from "class-validator";

const CHANNELS = ["PUSH", "SMS", "WHATSAPP", "EMAIL"] as const;
export type NotificationChannelValue = (typeof CHANNELS)[number];

export enum NotificationTemplateCategoryDto {
  EMPLOYEE = "EMPLOYEE",
  DRIVER = "DRIVER",
  VENDOR = "VENDOR",
  CORPORATE = "CORPORATE",
  GUARD = "GUARD",
  BILLING = "BILLING",
  COMPLIANCE = "COMPLIANCE",
  SAFETY = "SAFETY",
  SYSTEM = "SYSTEM",
}

export class CreateNotificationTemplateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(NotificationTemplateCategoryDto)
  category!: NotificationTemplateCategoryDto;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(CHANNELS, { each: true })
  channels!: NotificationChannelValue[];

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(NotificationTemplateCategoryDto)
  category?: NotificationTemplateCategoryDto;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(CHANNELS, { each: true })
  channels?: NotificationChannelValue[];

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
