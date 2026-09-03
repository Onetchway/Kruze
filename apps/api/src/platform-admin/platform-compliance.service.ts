import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Platform-wide Safety & Compliance visibility (spec §28/§31): document
 * status counts across all drivers/vehicles/guards, plus every SafetyPolicy
 * currently defined (SafetyPolicy is corporate-scoped in this schema —
 * there is no separate "global template" table — so this surfaces every
 * corporate's policy as a flat, platform-wide read-only list rather than
 * inventing a parallel template model).
 */
@Injectable()
export class PlatformComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [byStatus, byEntityType, verifiedExpired, verifiedExpiring, verifiedValid] = await Promise.all([
      this.prisma.document.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.document.groupBy({ by: ["entityType"], _count: { _all: true } }),
      this.prisma.document.count({ where: { status: "VERIFIED", expiryDate: { lt: now } } }),
      this.prisma.document.count({ where: { status: "VERIFIED", expiryDate: { gte: now, lt: soon } } }),
      this.prisma.document.count({ where: { status: "VERIFIED", OR: [{ expiryDate: null }, { expiryDate: { gte: soon } }] } }),
    ]);

    return {
      documents: {
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
        byEntityType: Object.fromEntries(byEntityType.map((r) => [r.entityType, r._count._all])),
        // Derived from real expiryDate values on VERIFIED documents —
        // VALID/EXPIRING(<=30d)/EXPIRED, alongside the raw PENDING/REJECTED
        // status counts above.
        valid: verifiedValid,
        expiringSoon: verifiedExpiring,
        expired: verifiedExpired,
      },
    };
  }

  async listSafetyPolicies() {
    return this.prisma.safetyPolicy.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        organisation: { select: { id: true, displayName: true, globalOrgId: true } },
        rules: true,
      },
    });
  }
}
