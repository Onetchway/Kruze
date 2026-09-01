import { Request } from "express";

/**
 * The authenticated identity for a request: which user, and which
 * organisation membership they are currently acting under. Every module
 * derives its authorization scope from this — never from a client-supplied
 * organisationId in the request body.
 */
export interface AuthenticatedUser {
  userId: string;
  organisationId: string;
  membershipId: string;
  role: string;
}

export interface RequestWithContext extends Request {
  user?: AuthenticatedUser;
  correlationId?: string;
}
