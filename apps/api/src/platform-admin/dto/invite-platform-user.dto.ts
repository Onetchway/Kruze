import { IsEmail, IsEnum, IsString, IsUUID, MinLength } from "class-validator";
import { PlatformRole } from "@kruze/domain";

/** Cross-tenant user provisioning from the Super Admin User Management screen. */
export class InvitePlatformUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsUUID()
  organisationId!: string;

  @IsEnum(PlatformRole)
  role!: PlatformRole;
}
