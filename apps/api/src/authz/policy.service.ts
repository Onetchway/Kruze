import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthorizationDecision, AuthorizationResult } from "@kruze/domain";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";

const ACTIVE_RELATIONSHIP_STATUS = "ACTIVE";

/**
 * Central relationship/attribute authorization layer. RolesGuard already
 * rejected callers whose role can never perform this action; this service
 * answers the harder question — "does THIS caller's organisation have a
 * live relationship to THIS resource's organisation" — which is what
 * makes cross-tenant/cross-vendor isolation actually enforceable.
 *
 * Never authorize using a resource ID alone: callers must resolve the
 * resource's owning organisation first and pass it in here.
 */
@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Throws if `user` may not act on a resource owned by `resourceOrgId`.
   * Same-organisation access is always allowed; cross-organisation access
   * requires an ACTIVE OrganisationRelationship between the two orgs.
   */
  async assertOrganisationAccess(
    user: AuthenticatedUser,
    resourceOrgId: string,
  ): Promise<AuthorizationResult> {
    if (user.organisationId === resourceOrgId) {
      return { decision: AuthorizationDecision.ALLOW, reason: "same_organisation" };
    }

    const relationship = await this.prisma.organisationRelationship.findFirst({
      where: {
        status: ACTIVE_RELATIONSHIP_STATUS,
        OR: [
          { sourceOrgId: user.organisationId, targetOrgId: resourceOrgId },
          { sourceOrgId: resourceOrgId, targetOrgId: user.organisationId },
        ],
      },
    });

    if (relationship) {
      return { decision: AuthorizationDecision.ALLOW, reason: `relationship:${relationship.type}` };
    }

    throw new ForbiddenException("No active relationship authorizes access to this organisation's resources");
  }

  /**
   * Resource-scoped variant for driver/vehicle/guard eligibility: a
   * Corporate may only see a resource if it holds an explicit
   * CorporateResourceEligibility record for it — a vendor relationship to
   * the corporate is not, by itself, sufficient (spec §4: "does not
   * automatically gain edit rights over the vendor's underlying... master").
   */
  async assertCorporateResourceEligibility(
    corporateOrgId: string,
    resourceType: "DRIVER" | "VEHICLE" | "GUARD",
    resourceId: string,
  ): Promise<AuthorizationResult> {
    const eligibility = await this.prisma.corporateResourceEligibility.findUnique({
      where: {
        corporateOrgId_resourceType_resourceId: {
          corporateOrgId,
          resourceType,
          resourceId,
        },
      },
    });

    if (eligibility && eligibility.status === "ACTIVE") {
      return { decision: AuthorizationDecision.ALLOW, reason: "corporate_resource_eligibility" };
    }

    throw new ForbiddenException("Resource is not authorized for this corporate");
  }
}
