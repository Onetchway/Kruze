import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { OrganisationRole } from "@kruze/domain";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsString()
  @MinLength(2)
  organisationLegalName!: string;

  @IsString()
  @MinLength(2)
  organisationDisplayName!: string;

  @IsEnum(OrganisationRole)
  organisationRole!: OrganisationRole;
}
