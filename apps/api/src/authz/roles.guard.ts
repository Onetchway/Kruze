import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PlatformRole } from "@kruze/domain";
import { ROLES_METADATA_KEY } from "./roles.decorator";
import { RequestWithContext } from "../common/request-context";

/**
 * RBAC is only the first authorization layer (spec §5). This guard rejects
 * requests whose role isn't even in the allowed set for the route; it does
 * NOT grant access — PolicyService still evaluates relationship/attribute
 * context before a handler may act on a specific resource.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.get<PlatformRole[] | undefined>(
      ROLES_METADATA_KEY,
      context.getHandler(),
    );
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithContext>();
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role as PlatformRole)) {
      throw new ForbiddenException("Role not permitted for this action");
    }
    return true;
  }
}
