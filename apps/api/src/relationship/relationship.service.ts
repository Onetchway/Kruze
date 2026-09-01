import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrganisationRelationshipStatus, OrganisationRelationshipType } from "@kruze/domain";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";

@Injectable()
export class RelationshipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Source organisation invites target into a relationship. Both
   * directions of "who onboards whom" from the spec (Operator→Corporate,
   * Corporate→Vendor) use this same table/flow, differentiated only by
   * `type`.
   */
  async invite(actor: AuthenticatedUser, input: { targetOrgId: string; type: OrganisationRelationshipType }) {
    if (actor.organisationId === input.targetOrgId) {
      throw new BadRequestException("An organisation cannot form a relationship with itself");
    }

    const [source, target] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: actor.organisationId } }),
      this.prisma.organisation.findUnique({ where: { id: input.targetOrgId } }),
    ]);
    if (!target) {
      throw new NotFoundException("Target organisation not found");
    }
    if (source?.status !== "ACTIVE") {
      throw new BadRequestException("Your organisation must be approved and active before it can form relationships");
    }
    if (target.status !== "ACTIVE") {
      throw new BadRequestException("The target organisation is not active");
    }

    return this.prisma.organisationRelationship.create({
      data: {
        sourceOrgId: actor.organisationId,
        targetOrgId: input.targetOrgId,
        type: input.type,
        status: OrganisationRelationshipStatus.INVITED,
        createdByUserId: actor.userId,
      },
    });
  }

  /** Only the invited (target) organisation may accept. */
  async accept(actor: AuthenticatedUser, relationshipId: string) {
    const relationship = await this.getOwned(relationshipId);
    if (relationship.targetOrgId !== actor.organisationId) {
      throw new ForbiddenException("Only the invited organisation may accept this relationship");
    }
    if (relationship.status !== OrganisationRelationshipStatus.INVITED) {
      throw new BadRequestException(`Relationship is not in an acceptable state (${relationship.status})`);
    }

    const [source, target] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: relationship.sourceOrgId } }),
      this.prisma.organisation.findUnique({ where: { id: relationship.targetOrgId } }),
    ]);
    if (target?.status !== "ACTIVE") {
      throw new BadRequestException("Your organisation must be approved and active before it can accept relationships");
    }
    if (source?.status !== "ACTIVE") {
      throw new BadRequestException("The inviting organisation is not active");
    }

    return this.prisma.organisationRelationship.update({
      where: { id: relationshipId },
      data: {
        status: OrganisationRelationshipStatus.ACTIVE,
        approvedByUserId: actor.userId,
        startsAt: new Date(),
      },
    });
  }

  async terminate(actor: AuthenticatedUser, relationshipId: string) {
    const relationship = await this.getOwned(relationshipId);
    if (relationship.sourceOrgId !== actor.organisationId && relationship.targetOrgId !== actor.organisationId) {
      throw new ForbiddenException("Not a party to this relationship");
    }

    return this.prisma.organisationRelationship.update({
      where: { id: relationshipId },
      data: { status: OrganisationRelationshipStatus.TERMINATED, endsAt: new Date() },
    });
  }

  async listForOrganisation(organisationId: string) {
    return this.prisma.organisationRelationship.findMany({
      where: { OR: [{ sourceOrgId: organisationId }, { targetOrgId: organisationId }] },
      orderBy: { createdAt: "desc" },
      include: {
        sourceOrg: { select: { id: true, globalOrgId: true, displayName: true, roles: true } },
        targetOrg: { select: { id: true, globalOrgId: true, displayName: true, roles: true } },
      },
    });
  }

  private async getOwned(relationshipId: string) {
    const relationship = await this.prisma.organisationRelationship.findUnique({
      where: { id: relationshipId },
    });
    if (!relationship) {
      throw new NotFoundException("Relationship not found");
    }
    return relationship;
  }
}
