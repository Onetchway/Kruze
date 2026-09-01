import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";

@Injectable()
export class ContractService {
  constructor(private readonly prisma: PrismaService) {}

  /** A contract may only be created between a corporate and a vendor holding an ACTIVE relationship. */
  async create(
    actor: AuthenticatedUser,
    input: { vendorOrgId: string; scopeCities?: string[]; startsAt: string; endsAt?: string; slaTargets?: unknown },
  ) {
    const relationship = await this.prisma.organisationRelationship.findFirst({
      where: {
        status: "ACTIVE",
        type: "CORPORATE_VENDOR",
        OR: [
          { sourceOrgId: actor.organisationId, targetOrgId: input.vendorOrgId },
          { sourceOrgId: input.vendorOrgId, targetOrgId: actor.organisationId },
        ],
      },
    });
    if (!relationship) {
      throw new BadRequestException("No active corporate-vendor relationship to contract against");
    }

    return this.prisma.contract.create({
      data: {
        corporateOrgId: actor.organisationId,
        vendorOrgId: input.vendorOrgId,
        organisationRelationshipId: relationship.id,
        scopeCities: input.scopeCities ?? [],
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        slaTargets: input.slaTargets as never,
        status: "DRAFT",
      },
    });
  }

  async activate(contractId: string) {
    return this.prisma.contract.update({ where: { id: contractId }, data: { status: "ACTIVE" } });
  }

  listForOrganisation(organisationId: string) {
    return this.prisma.contract.findMany({
      where: { OR: [{ corporateOrgId: organisationId }, { vendorOrgId: organisationId }] },
      include: { rateCards: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async addRateCard(
    contractId: string,
    input: {
      vehicleType: string;
      zoneId?: string;
      pricingModel: string;
      pricingRules: unknown;
      effectiveFrom: string;
      effectiveTo?: string;
    },
  ) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    const latest = await this.prisma.rateCard.findFirst({
      where: { contractId, vehicleType: input.vehicleType, zoneId: input.zoneId ?? null },
      orderBy: { version: "desc" },
    });

    return this.prisma.rateCard.create({
      data: {
        contractId,
        vehicleType: input.vehicleType,
        zoneId: input.zoneId,
        pricingModel: input.pricingModel,
        pricingRules: input.pricingRules as never,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
        version: (latest?.version ?? 0) + 1,
      },
    });
  }

  /**
   * The rate card in force for a vehicle type (and optionally a zone) on a
   * given date — used by billing at trip-charge time. A zone-specific card
   * takes priority; a card with no zone is the fallback for any zone.
   */
  async findEffectiveRateCard(contractId: string, vehicleType: string, atDate: Date, zoneId?: string | null) {
    const effectiveWindow = {
      effectiveFrom: { lte: atDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: atDate } }],
    };

    if (zoneId) {
      const zoneSpecific = await this.prisma.rateCard.findFirst({
        where: { contractId, vehicleType, zoneId, ...effectiveWindow },
        orderBy: { version: "desc" },
      });
      if (zoneSpecific) {
        return zoneSpecific;
      }
    }

    return this.prisma.rateCard.findFirst({
      where: { contractId, vehicleType, zoneId: null, ...effectiveWindow },
      orderBy: { version: "desc" },
    });
  }
}
