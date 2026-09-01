import { ArrayNotEmpty, IsArray, IsEnum, IsString, MinLength } from "class-validator";
import { OrganisationRole } from "@kruze/domain";

export class CreateOrganisationDto {
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
}
