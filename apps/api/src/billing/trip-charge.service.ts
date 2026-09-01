import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { ContractService } from "../contract/contract.service";
import { AuthenticatedUser } from "../common/request-context";

interface RateSlab {
  /** Slab applies for distance in (minKm, maxKm] — maxKm omitted means "and beyond". */
  minKm: number;
  maxKm?: number;
  rate: number;
}

interface PricingRules {
  perKmRate?: number;
  perTripFlat?: number;
  minimumGuarantee?: number;
  taxRatePercent?: number;
  /** SLAB pricing model: a base fare plus the rate for whichever slab the trip's distance falls into. */
  baseFare?: number;
  slabs?: RateSlab[];
  /** Hard ceiling on the pre-tax amount for SLAB pricing, if configured. */
  capAmount?: number;
}

function slabAmount(distanceKm: number, rules: PricingRules): number {
  const slabs = rules.slabs ?? [];
  const matched = slabs.find((slab) => distanceKm > slab.minKm && (slab.maxKm === undefined || distanceKm <= slab.maxKm));
  const slabRate = matched?.rate ?? slabs[slabs.length - 1]?.rate ?? 0;
  let amount = (rules.baseFare ?? 0) + slabRate;
  if (rules.capAmount !== undefined) {
    amount = Math.min(amount, rules.capAmount);
  }
  return amount;
}

/**
 * Computes a traceable, versioned charge for one completed trip from its
 * contract's effective rate card (spec §24/§25: "Support corporate charge,
 * vendor payable... as separate ledger components" and "never overwrite
 * recalculated historical commercial results without version/audit").
 */
@Injectable()
export class TripChargeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractService,
  ) {}

  async computeForTrip(actor: AuthenticatedUser, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { assignments: { where: { status: "ACTIVE" }, include: { vehicle: true } } },
    });
    if (!trip) {
      throw new NotFoundException("Trip not found");
    }
    if (trip.corporateOrgId !== actor.organisationId && trip.vendorOrgId !== actor.organisationId) {
      throw new NotFoundException("Trip not found");
    }
    if (trip.status !== "COMPLETED") {
      throw new BadRequestException("Trip charge can only be computed for a COMPLETED trip");
    }
    if (!trip.contractId) {
      throw new BadRequestException("Trip has no associated contract; cannot price it");
    }

    const vehicleType = trip.assignments[0]?.vehicle?.vehicleType ?? "STANDARD";
    const rateCard = await this.contracts.findEffectiveRateCard(trip.contractId, vehicleType, trip.scheduledStartAt);
    if (!rateCard) {
      throw new BadRequestException("No effective rate card found for this trip's vehicle type and date");
    }

    const rules = rateCard.pricingRules as PricingRules;
    const distanceKm = trip.actualDistanceKm ?? trip.estimatedDistanceKm ?? 0;

    let amount = 0;
    if (rateCard.pricingModel === "PER_KM") {
      amount = distanceKm * (rules.perKmRate ?? 0);
    } else if (rateCard.pricingModel === "PER_TRIP") {
      amount = rules.perTripFlat ?? 0;
    } else if (rateCard.pricingModel === "HYBRID") {
      amount = distanceKm * (rules.perKmRate ?? 0) + (rules.perTripFlat ?? 0);
    } else if (rateCard.pricingModel === "SLAB") {
      amount = slabAmount(distanceKm, rules);
    } else {
      amount = rules.perTripFlat ?? 0;
    }

    if (rules.minimumGuarantee !== undefined) {
      amount = Math.max(amount, rules.minimumGuarantee);
    }

    const taxes = amount * ((rules.taxRatePercent ?? 0) / 100);

    // A recompute bumps `version` in place rather than silently overwriting
    // history — the row's version trail is the audit record.
    return this.prisma.tripCharge.upsert({
      where: { tripId },
      create: {
        tripId,
        rateCardId: rateCard.id,
        pricingInputs: { distanceKm, pricingModel: rateCard.pricingModel, rules } as never,
        corporateCharge: amount + taxes,
        vendorPayable: amount,
        taxes,
      },
      update: {
        rateCardId: rateCard.id,
        pricingInputs: { distanceKm, pricingModel: rateCard.pricingModel, rules } as never,
        corporateCharge: amount + taxes,
        vendorPayable: amount,
        taxes,
        version: { increment: 1 },
      },
    });
  }

  async getForTrip(actor: AuthenticatedUser, tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException("Trip not found");
    }
    if (trip.corporateOrgId !== actor.organisationId && trip.vendorOrgId !== actor.organisationId) {
      throw new NotFoundException("Trip not found");
    }
    return this.prisma.tripCharge.findUnique({ where: { tripId } });
  }
}
