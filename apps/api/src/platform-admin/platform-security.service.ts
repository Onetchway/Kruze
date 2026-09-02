import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Security Center (spec "Is Kruze secure?"). Everything here is derived
 * from real auth/audit data — failed logins and role changes are genuine
 * audit_log rows written by AuthService/AuditInterceptor. API-key and
 * OAuth events are out of scope for this pass (no developer-platform
 * module exists yet), so that section is honestly omitted rather than
 * faked.
 */
@Injectable()
export class PlatformSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [failedLogins, successfulLogins, roleChanges, suspensions, recentAuditActions, suspendedOrgs] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: "LOGIN_FAILED", createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actor: { select: { email: true, displayName: true } } },
      }),
      this.prisma.auditLog.count({ where: { action: "LOGIN_SUCCEEDED", createdAt: { gte: since } } }),
      this.prisma.auditLog.findMany({
        where: { action: "MEMBERSHIP_ROLE_CHANGED", createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actor: { select: { email: true, displayName: true } }, organisation: { select: { displayName: true } } },
      }),
      this.prisma.auditLog.findMany({
        where: { action: { in: ["ORGANISATION_SUSPENDED", "ORGANISATION_REACTIVATED"] }, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actor: { select: { email: true, displayName: true } }, organisation: { select: { displayName: true } } },
      }),
      this.prisma.auditLog.groupBy({
        by: ["action"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { action: "desc" } },
        take: 10,
      }),
      this.prisma.organisation.findMany({
        where: { status: "SUSPENDED" },
        select: { id: true, globalOrgId: true, displayName: true, suspendedAt: true, suspendedReason: true },
      }),
    ]);

    return {
      last7Days: {
        failedLoginCount: failedLogins.length,
        successfulLoginCount: successfulLogins,
        roleChangeCount: roleChanges.length,
      },
      failedLogins,
      roleChanges,
      suspensionEvents: suspensions,
      currentlySuspendedOrganisations: suspendedOrgs,
      topAuditActions: recentAuditActions.map((r) => ({ action: r.action, count: r._count._all })),
      // Honest placeholders — no developer-platform (API keys/OAuth/webhooks)
      // module exists yet in this pass, so these are surfaced as
      // known-not-implemented rather than fabricated.
      apiKeyEvents: { implemented: false, note: "API key / OAuth developer platform is out of scope for this pass." },
    };
  }
}
