import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { PolicyService } from "../authz/policy.service";
import { AuthenticatedUser } from "../common/request-context";

@Injectable()
export class GuardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async createForVendor(vendorOrgId: string, input: { fullName: string; phone: string }) {
    const existingCount = await this.prisma.guard.count();
    const globalGuardId = `KZ-GRD-${String(existingCount + 1).padStart(6, "0")}`;

    return this.prisma.guard.create({
      data: {
        globalGuardId,
        fullName: input.fullName,
        phone: input.phone,
        vendorRelationships: {
          create: { vendorOrgId, status: "ACTIVE", startsAt: new Date() },
        },
      },
      include: { vendorRelationships: true },
    });
  }

  listForVendor(vendorOrgId: string) {
    return this.prisma.guard.findMany({
      where: { vendorRelationships: { some: { vendorOrgId, status: "ACTIVE" } } },
      include: { vendorRelationships: { where: { vendorOrgId } } },
    });
  }

  async getForOrganisation(actor: AuthenticatedUser, guardId: string) {
    const guard = await this.prisma.guard.findUnique({
      where: { id: guardId },
      include: { vendorRelationships: true },
    });
    if (!guard) {
      throw new NotFoundException("Guard not found");
    }

    const isOwnVendor = guard.vendorRelationships.some(
      (rel) => rel.vendorOrgId === actor.organisationId && rel.status === "ACTIVE",
    );
    if (isOwnVendor) {
      return guard;
    }

    await this.policy.assertCorporateResourceEligibility(actor.organisationId, "GUARD", guardId);
    return guard;
  }
}
