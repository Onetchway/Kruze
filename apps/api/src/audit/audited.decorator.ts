import { SetMetadata } from "@nestjs/common";

export const AUDITED_METADATA_KEY = "kruze:audited";

export interface AuditedOptions {
  action: string;
  resourceType: string;
}

/**
 * Marks a handler as producing an auditable mutation. AuditInterceptor
 * reads this metadata and writes an audit_log row for every successful
 * response, capturing actor, organisation, correlation ID and the
 * response body as the "after" value.
 */
export const Audited = (options: AuditedOptions) => SetMetadata(AUDITED_METADATA_KEY, options);
