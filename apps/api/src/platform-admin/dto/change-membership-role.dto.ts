import { IsEnum } from "class-validator";
import { PlatformRole } from "@kruze/domain";

export class ChangeMembershipRoleDto {
  @IsEnum(PlatformRole)
  role!: PlatformRole;
}
