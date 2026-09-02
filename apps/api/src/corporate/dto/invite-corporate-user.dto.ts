import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { PlatformRole } from "../../../generated/prisma";

/** Roles a corporate admin may grant to a teammate — never a platform/vendor/driver role. */
export const INVITABLE_CORPORATE_ROLES: PlatformRole[] = [
  "CORPORATE_TRANSPORT_ADMIN",
  "CORPORATE_HR",
  "CORPORATE_FINANCE",
  "CORPORATE_SAFETY_COMPLIANCE",
  "AUDITOR",
];

export class InviteCorporateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsEnum(PlatformRole)
  role!: PlatformRole;
}
