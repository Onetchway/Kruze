import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Read side of the Automation Decision Log (spec §44/§59) — lets a Super
 * Admin see exactly why the planning engine picked each trip's
 * driver/vehicle/guard, and why every rejected candidate was rejected.
 * Every row here is written by PlanningService as it allocates; nothing
 * is fabricated here.
 */
@Injectable()
export class PlatformDecisionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { tripId?: string; corporateOrgId?: string; q?: string; cursor?: string; limit?: number }) {
    const take = Math.min(params.limit ?? 50, 200);
    const rows = await this.prisma.planningDecisionLog.findMany({
      where: {
        tripId: params.tripId,
        corporateOrgId: params.corporateOrgId,
        ...(params.q
          ? {
              OR: [
                { trip: { globalTripId: { contains: params.q, mode: "insensitive" } } },
                { trip: { corporateOrg: { displayName: { contains: params.q, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        trip: {
          select: {
            id: true,
            globalTripId: true,
            status: true,
            scheduledStartAt: true,
            corporateOrg: { select: { id: true, displayName: true } },
            vendorOrg: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return { entries: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  get(id: string) {
    return this.prisma.planningDecisionLog.findUnique({
      where: { id },
      include: {
        trip: {
          select: {
            id: true,
            globalTripId: true,
            status: true,
            scheduledStartAt: true,
            corporateOrg: { select: { id: true, displayName: true } },
            vendorOrg: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  getForTrip(tripId: string) {
    return this.prisma.planningDecisionLog.findUnique({ where: { tripId } });
  }
}
