import { SetMetadata } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";

export const ROLES_METADATA_KEY = "kruze:roles";

/** Coarse RBAC gate: the caller's active-membership role must be in this list. */
export const Roles = (...roles: PlatformRole[]) => SetMetadata(ROLES_METADATA_KEY, roles);
