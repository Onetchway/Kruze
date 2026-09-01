import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { ComplianceRuleService } from "./compliance-rule.service";
import { ComplianceStatus, ComplianceSubjectType } from "../../generated/prisma";

export interface ComplianceEvaluationResult {
  status: ComplianceStatus;
  blockingFailures: string[];
  warnings: string[];
}

/**
 * The eligibility gate the allocation engine calls before assigning any
 * driver/vehicle/guard: compliance is evaluated as global + vendor +
 * corporate requirements combined, and a BLOCKING failure on any one of
 * them makes the subject NON_COMPLIANT overall — never auto-assignable.
 */
@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: ComplianceRuleService,
  ) {}

  async evaluate(
    subjectType: ComplianceSubjectType,
    subjectId: string,
    context: { vendorOrgId?: string; corporateOrgId?: string } = {},
  ): Promise<ComplianceEvaluationResult> {
    const applicableRules = await this.rules.applicableRules(
      subjectType,
      context.vendorOrgId,
      context.corporateOrgId,
    );

    const documents = await this.prisma.document.findMany({
      where: { entityType: subjectType, entityId: subjectId, status: "VERIFIED" },
    });

    const blockingFailures: string[] = [];
    const warnings: string[] = [];
    const now = new Date();

    for (const rule of applicableRules) {
      const matchingDoc = documents
        .filter((d) => d.docType === rule.docType)
        .sort((a, b) => (b.expiryDate?.getTime() ?? 0) - (a.expiryDate?.getTime() ?? 0))[0];

      let ruleStatus: ComplianceStatus;
      if (!matchingDoc) {
        ruleStatus = "NON_COMPLIANT";
      } else if (!matchingDoc.expiryDate || matchingDoc.expiryDate > now) {
        ruleStatus = "COMPLIANT";
      } else {
        const graceMs = rule.maxExpiryGraceDays * 24 * 60 * 60 * 1000;
        ruleStatus = matchingDoc.expiryDate.getTime() + graceMs > now.getTime() ? "EXPIRING" : "NON_COMPLIANT";
      }

      await this.prisma.complianceEvaluation.create({
        data: {
          subjectType,
          subjectId,
          ruleId: rule.id,
          status: ruleStatus,
          details: { docType: rule.docType, matchingDocumentId: matchingDoc?.id ?? null },
        },
      });

      if (ruleStatus === "NON_COMPLIANT" && rule.severity === "BLOCKING") {
        blockingFailures.push(rule.docType);
      } else if (ruleStatus !== "COMPLIANT") {
        warnings.push(rule.docType);
      }
    }

    const status: ComplianceStatus =
      blockingFailures.length > 0 ? "NON_COMPLIANT" : warnings.length > 0 ? "EXPIRING" : "COMPLIANT";

    return { status, blockingFailures, warnings };
  }

  /** Convenience boolean used by allocation: is this subject assignable right now? */
  async isEligible(
    subjectType: ComplianceSubjectType,
    subjectId: string,
    context: { vendorOrgId?: string; corporateOrgId?: string } = {},
  ): Promise<boolean> {
    const result = await this.evaluate(subjectType, subjectId, context);
    return result.status !== "NON_COMPLIANT";
  }
}
