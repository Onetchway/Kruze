import { Body, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { DocumentService } from "./document.service";
import { ComplianceRuleService } from "./compliance-rule.service";
import { ComplianceService } from "./compliance.service";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CreateComplianceRuleDto } from "./dto/create-compliance-rule.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";
import { ComplianceSubjectType } from "../../generated/prisma";

@Controller("documents")
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documents: DocumentService) {}

  @Post()
  @Audited({ action: "DOCUMENT_UPLOADED", resourceType: "Document" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user, dto);
  }

  @Post(":id/verify")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.KRUZE_SUPER_ADMIN)
  @Audited({ action: "DOCUMENT_VERIFIED", resourceType: "Document" })
  verify(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body("approve") approve: boolean) {
    return this.documents.verify(user, id, approve !== false);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("entityType") entityType: ComplianceSubjectType, @Query("entityId") entityId: string) {
    return this.documents.listForEntity(user, entityType, entityId);
  }
}

@Controller("compliance-rules")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceRuleController {
  constructor(private readonly rules: ComplianceRuleService) {}

  @Post()
  @Roles(PlatformRole.KRUZE_SUPER_ADMIN, PlatformRole.CORPORATE_SAFETY_COMPLIANCE, PlatformRole.VENDOR_ADMIN)
  @Audited({ action: "COMPLIANCE_RULE_CREATED", resourceType: "ComplianceRule" })
  create(@Body() dto: CreateComplianceRuleDto) {
    return this.rules.create(dto);
  }

  @Get()
  list(@Query("subjectType") subjectType?: ComplianceSubjectType) {
    return this.rules.list(subjectType);
  }
}

@Controller("compliance")
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  /** GET /v1/compliance/eligibility?subjectType=DRIVER&subjectId=...&vendorOrgId=...&corporateOrgId=... */
  @Get("eligibility")
  eligibility(
    @CurrentUser() user: AuthenticatedUser,
    @Query("subjectType") subjectType: ComplianceSubjectType,
    @Query("subjectId") subjectId: string,
    @Query("vendorOrgId") vendorOrgId?: string,
    @Query("corporateOrgId") corporateOrgId?: string,
  ) {
    if (
      user.role !== "KRUZE_SUPER_ADMIN" &&
      vendorOrgId !== user.organisationId &&
      corporateOrgId !== user.organisationId
    ) {
      throw new ForbiddenException("Not authorized to check eligibility for this organisation context");
    }
    return this.compliance.evaluate(subjectType, subjectId, { vendorOrgId, corporateOrgId });
  }
}
