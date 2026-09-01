import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUser, RequestWithContext } from "../common/request-context";

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<RequestWithContext>();
    return req.user as AuthenticatedUser;
  },
);
