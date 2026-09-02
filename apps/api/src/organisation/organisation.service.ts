import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrganisationRole, OrganisationStatus } from "@kruze/domain";
import { PrismaService } from "../common/prisma/prisma.service";
import { formatGlobalOrgId } from "./global-id.util";
import { AdminCreateOrganisationDto } from "./dto/admin-create-organisation.dto";
import { UpdateOrganisationProfileDto } from "./dto/update-organisation-profile.dto";

@Injectable()
export class OrganisationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an organisation in PENDING_APPROVAL. Whether Kruze approval is
   * mandatory before activation is a plan-level policy decision (spec §29 /
   * §31) applied by the approval workflow, not hard-coded here.
   */
  async requestOnboarding(input: { legalName: string; displayName: string; roles: OrganisationRole[] }) {
    const primaryRole = input.roles[0];
    const existingCount = await this.prisma.organisation.count({
      where: { roles: { has: primaryRole } },
    });
    const globalOrgId = formatGlobalOrgId(primaryRole, existingCount + 1);

    return this.prisma.organisation.create({
      data: {
        globalOrgId,
        legalName: input.legalName,
        displayName: input.displayName,
        roles: input.roles,
        status: OrganisationStatus.PENDING_APPROVAL,
      },
    });
  }

  /**
   * Super Admin tenant creation (spec §7) — created ACTIVE directly, since
   * a Super Admin creating the tenant is itself the approval step, with
   * the full profile captured up front rather than filled in later.
   */
  async adminCreate(input: AdminCreateOrganisationDto) {
    const primaryRole = input.roles[0];
    const existingCount = await this.prisma.organisation.count({
      where: { roles: { has: primaryRole } },
    });
    const globalOrgId = formatGlobalOrgId(primaryRole, existingCount + 1);
    const { legalName, displayName, roles, ...profile } = input;

    return this.prisma.organisation.create({
      data: {
        globalOrgId,
        legalName,
        displayName,
        roles,
        status: OrganisationStatus.ACTIVE,
        ...profile,
        brandConfig: profile.brandConfig as never,
      },
    });
  }

  async updateProfile(organisationId: string, input: UpdateOrganisationProfileDto) {
    await this.getOrThrow(organisationId);
    return this.prisma.organisation.update({
      where: { id: organisationId },
      data: { ...input, brandConfig: input.brandConfig as never },
    });
  }

  async suspend(organisationId: string, actorUserId: string, reason: string) {
    const org = await this.getOrThrow(organisationId);
    if (org.status === OrganisationStatus.SUSPENDED) {
      throw new BadRequestException("Organisation is already suspended");
    }
    return this.prisma.organisation.update({
      where: { id: organisationId },
      data: {
        status: OrganisationStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedReason: reason,
        suspendedByUserId: actorUserId,
      },
    });
  }

  async reactivate(organisationId: string) {
    const org = await this.getOrThrow(organisationId);
    if (org.status !== OrganisationStatus.SUSPENDED) {
      throw new BadRequestException("Organisation is not suspended");
    }
    return this.prisma.organisation.update({
      where: { id: organisationId },
      data: { status: OrganisationStatus.ACTIVE, suspendedAt: null, suspendedReason: null, suspendedByUserId: null },
    });
  }

  async getStats(organisationId: string) {
    await this.getOrThrow(organisationId);
    const [userCount, employeeCount, driverRelCount, vehicleRelCount, guardRelCount, relationshipCount, tripCount, subscription] =
      await Promise.all([
        this.prisma.organisationMembership.count({ where: { organisationId, status: "ACTIVE" } }),
        this.prisma.employee.count({ where: { corporateOrgId: organisationId } }),
        this.prisma.driverVendorRelationship.count({ where: { vendorOrgId: organisationId } }),
        this.prisma.vehicleVendorRelationship.count({ where: { vendorOrgId: organisationId } }),
        this.prisma.guardVendorRelationship.count({ where: { vendorOrgId: organisationId } }),
        this.prisma.organisationRelationship.count({
          where: { OR: [{ sourceOrgId: organisationId }, { targetOrgId: organisationId }], status: "ACTIVE" },
        }),
        this.prisma.trip.count({ where: { OR: [{ corporateOrgId: organisationId }, { vendorOrgId: organisationId }] } }),
        this.prisma.subscription.findUnique({ where: { organisationId }, include: { plan: true } }),
      ]);
    return {
      userCount,
      employeeCount,
      driverRelationshipCount: driverRelCount,
      vehicleRelationshipCount: vehicleRelCount,
      guardRelationshipCount: guardRelCount,
      activeRelationshipCount: relationshipCount,
      tripCount,
      subscription,
    };
  }

  async listUsers(organisationId: string) {
    await this.getOrThrow(organisationId);
    const memberships = await this.prisma.organisationMembership.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true, phone: true, displayName: true, status: true, mfaEnabled: true } } },
    });
    return memberships;
  }

  private async getOrThrow(organisationId: string) {
    const org = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!org) {
      throw new NotFoundException("Organisation not found");
    }
    return org;
  }

  async approve(organisationId: string) {
    const org = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!org) {
      throw new NotFoundException("Organisation not found");
    }
    return this.prisma.organisation.update({
      where: { id: organisationId },
      data: { status: OrganisationStatus.ACTIVE },
    });
  }

  findById(organisationId: string) {
    return this.prisma.organisation.findUnique({ where: { id: organisationId } });
  }

  list() {
    return this.prisma.organisation.findMany({ orderBy: { createdAt: "desc" } });
  }

  /**
   * Minimal public lookup by the human-readable Kruze ID, so one
   * organisation can find another to invite into a relationship without
   * a platform-admin-only directory. Global IDs are meant to be shared
   * for exactly this purpose (spec §3) — this never exposes anything
   * beyond what the ID itself already implies (name, type, status).
   */
  async findByGlobalId(globalOrgId: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { globalOrgId },
      select: { id: true, globalOrgId: true, displayName: true, roles: true, status: true },
    });
    if (!org) {
      throw new NotFoundException("No organisation found with that ID");
    }
    return org;
  }
}
