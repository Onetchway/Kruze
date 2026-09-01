/**
 * JWT claims. `sub` is the user, `orgId`/`membershipId`/`role` fix the
 * active organisation context for the lifetime of the token — a user with
 * memberships in several organisations must re-authenticate context (via
 * /auth/login with organisationId, or a future /auth/switch-organisation)
 * to act as a different one. This is what request-context.ts's
 * AuthenticatedUser is built from.
 */
export interface JwtPayload {
  sub: string;
  orgId: string;
  membershipId: string;
  role: string;
}
