import { PrismaService } from "../common/prisma/prisma.service";
import { ComplianceSubjectType } from "../../generated/prisma";

/**
 * Resolves which vendor organisation(s) currently manage a driver, vehicle
 * or guard, so compliance/document writes can be scoped to the party that
 * actually owns the resource rather than trusting a client-supplied org.
 */
export async function resolveOwningVendorOrgIds(
  prisma: PrismaService,
  subjectType: ComplianceSubjectType,
  subjectId: string,
): Promise<string[]> {
  switch (subjectType) {
    case "DRIVER": {
      const rels = await prisma.driverVendorRelationship.findMany({
        where: { driverId: subjectId, status: "ACTIVE" },
      });
      return rels.map((r) => r.vendorOrgId);
    }
    case "VEHICLE": {
      const rels = await prisma.vehicleVendorRelationship.findMany({
        where: { vehicleId: subjectId, status: "ACTIVE" },
      });
      return rels.map((r) => r.vendorOrgId);
    }
    case "GUARD": {
      const rels = await prisma.guardVendorRelationship.findMany({
        where: { guardId: subjectId, status: "ACTIVE" },
      });
      return rels.map((r) => r.vendorOrgId);
    }
    case "VENDOR":
      return [subjectId];
    default:
      return [];
  }
}
