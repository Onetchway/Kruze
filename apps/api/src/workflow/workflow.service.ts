import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";

/**
 * A single generic approval primitive (spec §7.29/§6.30/§30/§31: "Generic
 * configurable workflows") used across the platform — vendor onboarding,
 * invoice approval, manual override approval, ad-hoc transport approval —
 * rather than a bespoke approval table per workflow type. Callers own the
 * business meaning of `workflowType`/`resourceType`; this service only
 * owns the PENDING -> APPROVED/REJECTED/CANCELLED lifecycle and its audit
 * trail (actor, reason, before/after via decidedByUserId/decisionReason).
 */
@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  request(
    actor: AuthenticatedUser,
    input: { workflowType: string; resourceType: string; resourceId: string; organisationId?: string; context?: unknown },
  ) {
    return this.prisma.approvalRequest.create({
      data: {
        workflowType: input.workflowType,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        organisationId: input.organisationId,
        requestedByUserId: actor.userId,
        context: input.context as never,
      },
    });
  }

  async approve(actor: AuthenticatedUser, requestId: string, reason?: string) {
    const request = await this.getPending(requestId);
    return this.prisma.approvalRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", decidedByUserId: actor.userId, decisionReason: reason, decidedAt: new Date() },
    });
  }

  async reject(actor: AuthenticatedUser, requestId: string, reason?: string) {
    const request = await this.getPending(requestId);
    return this.prisma.approvalRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", decidedByUserId: actor.userId, decisionReason: reason, decidedAt: new Date() },
    });
  }

  async cancel(requestId: string) {
    const request = await this.getPending(requestId);
    return this.prisma.approvalRequest.update({ where: { id: request.id }, data: { status: "CANCELLED" } });
  }

  listPending(workflowType?: string) {
    return this.prisma.approvalRequest.findMany({
      where: { status: "PENDING", workflowType },
      orderBy: { createdAt: "asc" },
    });
  }

  forResource(resourceType: string, resourceId: string) {
    return this.prisma.approvalRequest.findMany({ where: { resourceType, resourceId }, orderBy: { createdAt: "desc" } });
  }

  private async getPending(requestId: string) {
    const request = await this.prisma.approvalRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException("Approval request not found");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestException(`Approval request is not pending (status=${request.status})`);
    }
    return request;
  }
}
