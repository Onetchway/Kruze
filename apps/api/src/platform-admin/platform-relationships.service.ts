import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Platform-wide view over OrganisationRelationship (spec §18: Corporate ↔
 * Vendor/Fleet-Operator relationships, contract reference, service dates,
 * status) — unlike RelationshipService (org-scoped, "my relationships"),
 * every list here spans every tenant, which is why it lives under
 * platform-admin rather than the relationship module itself.
 */
@Injectable()
export class PlatformRelationshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { type?: string; status?: string; organisationId?: string } = {}) {
    const { type, status, organisationId } = params;
    const relationships = await this.prisma.organisationRelationship.findMany({
      where: {
        ...(type ? { type: type as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(organisationId ? { OR: [{ sourceOrgId: organisationId }, { targetOrgId: organisationId }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        sourceOrg: { select: { id: true, globalOrgId: true, displayName: true, roles: true, status: true } },
        targetOrg: { select: { id: true, globalOrgId: true, displayName: true, roles: true, status: true } },
        createdBy: { select: { id: true, email: true, displayName: true } },
      },
    });

    // Contract reference is a separate model keyed by (corporateOrgId,
    // vendorOrgId) pair rather than the relationship id directly on older
    // rows, so it's looked up by org-pair match — a best-effort join, not
    // a hard foreign key, since a relationship can exist before any
    // contract is signed.
    const contracts = await this.prisma.contract.findMany({
      select: { id: true, corporateOrgId: true, vendorOrgId: true, status: true, startsAt: true, endsAt: true, scopeCities: true },
    });
    const contractByPair = new Map(contracts.map((c) => [`${c.corporateOrgId}:${c.vendorOrgId}`, c]));

    return relationships.map((r) => ({
      ...r,
      contract:
        contractByPair.get(`${r.sourceOrgId}:${r.targetOrgId}`) ??
        contractByPair.get(`${r.targetOrgId}:${r.sourceOrgId}`) ??
        null,
    }));
  }

  async get(id: string) {
    const relationship = await this.prisma.organisationRelationship.findUnique({
      where: { id },
      include: {
        sourceOrg: { select: { id: true, globalOrgId: true, displayName: true, roles: true, status: true } },
        targetOrg: { select: { id: true, globalOrgId: true, displayName: true, roles: true, status: true } },
        createdBy: { select: { id: true, email: true, displayName: true } },
        approvedBy: { select: { id: true, email: true, displayName: true } },
      },
    });
    if (!relationship) {
      throw new NotFoundException("Relationship not found");
    }
    const contract = await this.prisma.contract.findFirst({
      where: {
        OR: [
          { corporateOrgId: relationship.sourceOrgId, vendorOrgId: relationship.targetOrgId },
          { corporateOrgId: relationship.targetOrgId, vendorOrgId: relationship.sourceOrgId },
        ],
      },
      include: { rateCards: true },
    });
    return { ...relationship, contract };
  }

  async summary() {
    const [byType, byStatus, total] = await Promise.all([
      this.prisma.organisationRelationship.groupBy({ by: ["type"], _count: { _all: true } }),
      this.prisma.organisationRelationship.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.organisationRelationship.count(),
    ]);
    return {
      total,
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    };
  }
}
