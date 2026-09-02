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

  async activate(actor: AuthenticatedUser, contractId: string) {
    const contract = await this.getOwnedContract(actor, contractId);
    return this.prisma.contract.update({ where: { id: contract.id }, data: { status: "ACTIVE" } });
  }

  listForOrganisation(organisationId: string) {
    return this.prisma.contract.findMany({
      where: { OR: [{ corporateOrgId: organisationId }, { vendorOrgId: organisationId }] },
      include: { rateCards: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async addRateCard(
    actor: AuthenticatedUser,
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
    const contract = await this.getOwnedContract(actor, contractId);

    const latest = await this.prisma.rateCard.findFirst({
      where: { contractId: contract.id, vehicleType: input.vehicleType, zoneId: input.zoneId ?? null },
      orderBy: { version: "desc" },
    });

    return this.prisma.rateCard.create({
      data: {
        contractId: contract.id,
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

  /** Every rate card across every one of this corporate's contracts — powers the dedicated Rate Cards screen. */
  listRateCardsForCorporate(organisationId: string) {
    return this.prisma.rateCard.findMany({
      where: { contract: { corporateOrgId: organisationId } },
      include: { contract: true, zone: true },
      orderBy: [{ contractId: "asc" }, { vehicleType: "asc" }, { version: "desc" }],
    });
  }

  /**
   * Rate cards are versioned, never edited in place (see model comment):
   * "editing" closes out the current card (effectiveTo = now) and creates
   * a new version row with the changed fields.
   */
  async updateRateCard(
    actor: AuthenticatedUser,
    rateCardId: string,
    input: { pricingModel?: string; pricingRules?: unknown; effectiveFrom?: string; effectiveTo?: string },
  ) {
    const rateCard = await this.getOwnedRateCard(actor, rateCardId);
    return this.prisma.$transaction(async (tx) => {
      await tx.rateCard.update({ where: { id: rateCard.id }, data: { effectiveTo: new Date() } });
      return tx.rateCard.create({
        data: {
          contractId: rateCard.contractId,
          vehicleType: rateCard.vehicleType,
          zoneId: rateCard.zoneId,
          pricingModel: input.pricingModel ?? rateCard.pricingModel,
          pricingRules: (input.pricingRules ?? rateCard.pricingRules) as never,
          effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
          version: rateCard.version + 1,
        },
      });
    });
  }

  /** "Delete" = close out the card so it no longer applies going forward — the versioned history is never destroyed. */
  async removeRateCard(actor: AuthenticatedUser, rateCardId: string) {
    const rateCard = await this.getOwnedRateCard(actor, rateCardId);
    return this.prisma.rateCard.update({ where: { id: rateCard.id }, data: { effectiveTo: new Date() } });
  }

  private async getOwnedRateCard(actor: AuthenticatedUser, rateCardId: string) {
    const rateCard = await this.prisma.rateCard.findUnique({ where: { id: rateCardId }, include: { contract: true } });
    if (!rateCard) {
      throw new NotFoundException("Rate card not found");
    }
    if (rateCard.contract.corporateOrgId !== actor.organisationId && rateCard.contract.vendorOrgId !== actor.organisationId) {
      throw new NotFoundException("Rate card not found");
    }
    return rateCard;
  }

  private async getOwnedContract(actor: AuthenticatedUser, contractId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException("Contract not found");
    }
    if (contract.corporateOrgId !== actor.organisationId && contract.vendorOrgId !== actor.organisationId) {
      throw new NotFoundException("Contract not found");
    }
    return contract;
  }
}
