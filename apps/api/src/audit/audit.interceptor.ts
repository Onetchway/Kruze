import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AUDITED_METADATA_KEY, AuditedOptions } from "./audited.decorator";
import { AuditService } from "./audit.service";
import { RequestWithContext } from "../common/request-context";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditedOptions | undefined>(
      AUDITED_METADATA_KEY,
      context.getHandler(),
    );
    if (!options) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<RequestWithContext>();

    return next.handle().pipe(
      tap((responseBody) => {
        void this.auditService.record({
          actorUserId: req.user?.userId,
          organisationId: req.user?.organisationId,
          action: options.action,
          resourceType: options.resourceType,
          resourceId: extractResourceId(responseBody),
          afterValue: responseBody,
          reason: typeof req.body?.reason === "string" ? req.body.reason : undefined,
          correlationId: req.correlationId,
          ipAddress: req.ip,
        });
      }),
    );
  }
}

function extractResourceId(body: unknown): string | undefined {
  if (body && typeof body === "object" && "id" in body) {
    const id = (body as { id: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}
