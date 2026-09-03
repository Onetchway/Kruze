import { IsArray, IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateApiKeyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsUUID()
  organisationId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
