import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

export interface AuditLogFilter {
  organisationId?: string;
  actorUserId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

/** Platform Audit Log viewer (spec §60ish) — reads the same audit_logs
 * table AuditInterceptor/AuditService already write, no new storage. */
@Injectable()
export class PlatformAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: AuditLogFilter) {
    const take = Math.min(filter.limit ?? 50, 200);
    const entries = await this.prisma.auditLog.findMany({
      where: {
        ...(filter.organisationId ? { organisationId: filter.organisationId } : {}),
        ...(filter.actorUserId ? { actorUserId: filter.actorUserId } : {}),
        ...(filter.action ? { action: { contains: filter.action, mode: "insensitive" } } : {}),
        ...(filter.resourceType ? { resourceType: filter.resourceType } : {}),
        ...(filter.from || filter.to
          ? {
              createdAt: {
                ...(filter.from ? { gte: new Date(filter.from) } : {}),
                ...(filter.to ? { lte: new Date(filter.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(filter.cursor ? { skip: 1, cursor: { id: filter.cursor } } : {}),
      include: {
        actor: { select: { id: true, email: true, displayName: true } },
        organisation: { select: { id: true, globalOrgId: true, displayName: true } },
      },
    });

    const hasMore = entries.length > take;
    const page = hasMore ? entries.slice(0, take) : entries;
    return { entries: page, nextCursor: hasMore ? page[page.length - 1]?.id : null };
  }
}
