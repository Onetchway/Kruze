/**
 * RBAC alone is insufficient (spec §5 / §4): every authorization decision
 * must combine role permission, active organisation-relationship context,
 * and resource-level attributes. This type is the input contract every
 * policy check is built from — never authorize by resource ID alone.
 */
export interface AuthorizationContext {
  userId: string;
  organisationId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  /** e.g. city, site, department, contractId, corporateId, vendorId */
  attributes?: Record<string, string | undefined>;
}

export enum AuthorizationDecision {
  ALLOW = "ALLOW",
  DENY = "DENY",
}

export interface AuthorizationResult {
  decision: AuthorizationDecision;
  reason: string;
}
