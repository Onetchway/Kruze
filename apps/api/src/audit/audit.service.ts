import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

export interface RecordAuditEntryInput {
  actorUserId?: string;
  organisationId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  correlationId?: string;
  ipAddress?: string;
}

/**
 * Single write path for audit rows. Security-sensitive and operational
 * mutations must go through here (directly, or via AuditInterceptor's
 * declarative @Audited decorator) rather than each module inventing its
 * own logging.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RecordAuditEntryInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        organisationId: entry.organisationId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        beforeValue: entry.beforeValue as never,
        afterValue: entry.afterValue as never,
        reason: entry.reason,
        correlationId: entry.correlationId,
        ipAddress: entry.ipAddress,
      },
    });
  }
}
