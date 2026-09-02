import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { OrganisationRole } from "@kruze/domain";

/**
 * Super Admin tenant-creation form (spec §7) — unlike the public
 * self-service onboarding DTO, this carries the full organisation profile
 * and the resulting organisation is created ACTIVE directly (a Super Admin
 * creating a tenant IS the approval).
 */
export class AdminCreateOrganisationDto {
  @IsString()
  @MinLength(2)
  legalName!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(OrganisationRole, { each: true })
  roles!: OrganisationRole[];

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
