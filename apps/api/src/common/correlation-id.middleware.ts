import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export const CORRELATION_ID_HEADER = "x-correlation-id";

/**
 * Every request gets a correlation ID (reused from the caller if supplied)
 * so it can be threaded through logs, audit rows and downstream domain
 * events, per the spec's observability requirement.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use = (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header(CORRELATION_ID_HEADER);
    const correlationId = incoming && incoming.length > 0 ? incoming : randomUUID();
    (req as Request & { correlationId: string }).correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  };
}
