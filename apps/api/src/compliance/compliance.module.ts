import { Module } from "@nestjs/common";
import { DocumentService } from "./document.service";
import { ComplianceRuleService } from "./compliance-rule.service";
import { ComplianceService } from "./compliance.service";
import { DocumentController, ComplianceRuleController, ComplianceController } from "./compliance.controller";

@Module({
  providers: [DocumentService, ComplianceRuleService, ComplianceService],
  controllers: [DocumentController, ComplianceRuleController, ComplianceController],
  exports: [DocumentService, ComplianceRuleService, ComplianceService],
})
export class ComplianceModule {}
