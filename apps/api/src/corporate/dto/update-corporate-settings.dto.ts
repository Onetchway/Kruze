import { IsBoolean, IsDateString, IsEmail, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

export class NotificationChannelSettingsDto {
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;
}

export class UpdateCorporateSettingsDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsDateString()
  contractStartsAt?: string;

  @IsOptional()
  @IsDateString()
  contractEndsAt?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  employeePickupChangeLimit?: number;

  /**
   * Free-form policy/notification config, merged (not replaced) into the
   * existing `config` JSON — e.g. { notificationSettings: {...},
   * transportPolicy: {...} }. Keeping this open-ended avoids a schema
   * migration for every new configurable toggle the corporate wants.
   */
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
