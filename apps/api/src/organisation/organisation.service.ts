import { Injectable, NotFoundException } from "@nestjs/common";
import { OrganisationRole, OrganisationStatus } from "@kruze/domain";
import { PrismaService } from "../common/prisma/prisma.service";
import { formatGlobalOrgId } from "./global-id.util";

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
}
