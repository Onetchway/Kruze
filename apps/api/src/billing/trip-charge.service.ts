import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { ContractService } from "../contract/contract.service";

interface PricingRules {
  perKmRate?: number;
  perTripFlat?: number;
  minimumGuarantee?: number;
  taxRatePercent?: number;
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

  async computeForTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { assignments: { where: { status: "ACTIVE" }, include: { vehicle: true } } },
    });
    if (!trip) {
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

  getForTrip(tripId: string) {
    return this.prisma.tripCharge.findUnique({ where: { tripId } });
  }
}
