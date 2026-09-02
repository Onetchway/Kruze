import { PrismaService } from "./prisma/prisma.service";

/** Vendor org IDs with an ACTIVE CORPORATE_VENDOR relationship to this corporate — the corporate's "connected fleet" network. */
export async function eligibleVendorOrgIds(prisma: PrismaService, corporateOrgId: string): Promise<string[]> {
  const relationships = await prisma.organisationRelationship.findMany({
    where: { type: "CORPORATE_VENDOR", status: "ACTIVE", OR: [{ sourceOrgId: corporateOrgId }, { targetOrgId: corporateOrgId }] },
  });
  return relationships.map((r) => (r.sourceOrgId === corporateOrgId ? r.targetOrgId : r.sourceOrgId));
}
