import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { resolveOwningVendorOrgIds } from "./resource-ownership.util";
import { ComplianceSubjectType } from "../../generated/prisma";

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    actor: AuthenticatedUser,
    input: {
      entityType: ComplianceSubjectType;
      entityId: string;
      docType: string;
      issueDate?: string;
      expiryDate?: string;
      fileUrl?: string;
    },
  ) {
    const owningOrgIds = await resolveOwningVendorOrgIds(this.prisma, input.entityType, input.entityId);
    if (!owningOrgIds.includes(actor.organisationId) && actor.role !== "KRUZE_SUPER_ADMIN") {
      throw new ForbiddenException("Not authorized to manage documents for this resource");
    }

    return this.prisma.document.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        docType: input.docType,
        issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
        fileUrl: input.fileUrl,
        status: "PENDING",
      },
    });
  }

  async verify(actor: AuthenticatedUser, documentId: string, approve: boolean) {
    // Verification is a platform/compliance-team action in the general case;
    // foundation implementation restricts it to KRUZE_SUPER_ADMIN.
    if (actor.role !== "KRUZE_SUPER_ADMIN") {
      throw new ForbiddenException("Only compliance staff may verify documents");
    }
    return this.prisma.document.update({
      where: { id: documentId },
      data: { status: approve ? "VERIFIED" : "REJECTED", verifiedByUserId: actor.userId },
    });
  }

  listForEntity(entityType: ComplianceSubjectType, entityId: string) {
    return this.prisma.document.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
    });
  }
}
