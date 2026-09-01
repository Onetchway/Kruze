import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import {
  ComplianceScope,
  ComplianceSeverity,
  ComplianceSubjectType,
} from "../../generated/prisma";

@Injectable()
export class ComplianceRuleService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    scope: ComplianceScope;
    scopeOrgId?: string;
    subjectType: ComplianceSubjectType;
    docType: string;
    maxExpiryGraceDays?: number;
    severity?: ComplianceSeverity;
    active?: boolean;
  }) {
    return this.prisma.complianceRule.create({
      data: {
        scope: input.scope,
        scopeOrgId: input.scopeOrgId,
        subjectType: input.subjectType,
        docType: input.docType,
        maxExpiryGraceDays: input.maxExpiryGraceDays ?? 0,
        severity: input.severity ?? "BLOCKING",
        active: input.active ?? true,
      },
    });
  }

  list(subjectType?: ComplianceSubjectType) {
    return this.prisma.complianceRule.findMany({
      where: subjectType ? { subjectType } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  /** Rules applicable to a subject in a given vendor/corporate context. */
  async applicableRules(subjectType: ComplianceSubjectType, vendorOrgId?: string, corporateOrgId?: string) {
    return this.prisma.complianceRule.findMany({
      where: {
        subjectType,
        active: true,
        OR: [
          { scope: "GLOBAL" },
          ...(vendorOrgId ? [{ scope: "VENDOR" as const, scopeOrgId: vendorOrgId }] : []),
          ...(corporateOrgId ? [{ scope: "CORPORATE" as const, scopeOrgId: corporateOrgId }] : []),
        ],
      },
    });
  }
}
