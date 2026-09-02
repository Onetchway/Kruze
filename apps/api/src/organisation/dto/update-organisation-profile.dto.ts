import { IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

/** Partial update of the organisation profile fields added for spec §7. */
export class UpdateOrganisationProfileDto {
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() primaryContactName?: string;
  @IsOptional() @IsString() primaryContactEmail?: string;
  @IsOptional() @IsString() primaryContactPhone?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsInt() @Min(0) employeeCount?: number;
  @IsOptional() @IsInt() @Min(0) fleetSize?: number;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsObject() brandConfig?: Record<string, unknown>;
}
