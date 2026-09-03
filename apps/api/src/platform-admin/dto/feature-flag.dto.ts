import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export enum FeatureFlagScopeDto {
  GLOBAL = "GLOBAL",
  ORGANISATION = "ORGANISATION",
}

export class CreateFeatureFlagDto {
  @IsString()
  @MinLength(2)
  key!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(FeatureFlagScopeDto)
  scope?: FeatureFlagScopeDto;

  @IsOptional()
  @IsUUID()
  organisationId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
