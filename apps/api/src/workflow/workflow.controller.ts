import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { WorkflowService } from "./workflow.service";
import { CreateApprovalRequestDto } from "./dto/create-approval-request.dto";
import { DecideApprovalRequestDto } from "./dto/decide-approval-request.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

const APPROVER_ROLES = [
  PlatformRole.KRUZE_SUPER_ADMIN,
  PlatformRole.CORPORATE_TRANSPORT_ADMIN,
  PlatformRole.CORPORATE_FINANCE,
  PlatformRole.SUPERVISOR_DISPATCHER,
];

@Controller("approval-requests")
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Post()
  @Audited({ action: "APPROVAL_REQUESTED", resourceType: "ApprovalRequest" })
  request(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApprovalRequestDto) {
    return this.workflow.request(user, dto);
  }

  @Post(":id/approve")
  @UseGuards(RolesGuard)
  @Roles(...APPROVER_ROLES)
  @Audited({ action: "APPROVAL_GRANTED", resourceType: "ApprovalRequest" })
  approve(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: DecideApprovalRequestDto) {
    return this.workflow.approve(user, id, dto.reason);
  }

  @Post(":id/reject")
  @UseGuards(RolesGuard)
  @Roles(...APPROVER_ROLES)
  @Audited({ action: "APPROVAL_REJECTED", resourceType: "ApprovalRequest" })
  reject(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: DecideApprovalRequestDto) {
    return this.workflow.reject(user, id, dto.reason);
  }

  @Post(":id/cancel")
  @Audited({ action: "APPROVAL_CANCELLED", resourceType: "ApprovalRequest" })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.workflow.cancel(user, id);
  }

  @Get("pending")
  @UseGuards(RolesGuard)
  @Roles(...APPROVER_ROLES)
  listPending(@CurrentUser() user: AuthenticatedUser, @Query("workflowType") workflowType?: string) {
    return this.workflow.listPending(user, workflowType);
  }

  @Get("resource/:resourceType/:resourceId")
  forResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceType") resourceType: string,
    @Param("resourceId") resourceId: string,
  ) {
    return this.workflow.forResource(user, resourceType, resourceId);
  }
}
