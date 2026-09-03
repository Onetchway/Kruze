import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/** Default optimisation objective weights — used until a Super Admin saves an override. */
export const DEFAULT_PLANNING_WEIGHTS = {
  safety: 30,
  onTime: 25,
  rideTime: 15,
  utilization: 15,
  cost: 10,
  routeStability: 5,
};

export const DEFAULT_PLATFORM_BRANDING = {
  platformName: "Kruze",
  timezone: "Asia/Kolkata",
  currency: "INR",
  language: "en",
  logoUrl: null as string | null,
};

const PLANNING_WEIGHTS_KEY = "planning.objective_weights";
const PLATFORM_BRANDING_KEY = "platform.branding";

/**
 * Generic key-value store for platform-level config (spec: Planning &
 * Automation objective weights, Platform Settings branding/timezone/
 * currency/language). No optimisation engine exists that reads these
 * weights back yet (the CVRP solver in optimizer-client.ts takes no
 * weight parameters) — this is an honest, editable config surface, not a
 * claim that changing it re-tunes route generation.
 */
@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.platformSetting.findUnique({ where: { key } });
    return row ? (row.value as T) : fallback;
  }

  private async set(key: string, value: unknown, actorUserId?: string) {
    const row = await this.prisma.platformSetting.upsert({
      where: { key },
      create: { key, value: value as never, updatedByUserId: actorUserId },
      update: { value: value as never, updatedByUserId: actorUserId },
    });
    await this.prisma.platformSettingHistory.create({
      data: { key, value: value as never, changedBy: actorUserId },
    });
    return row;
  }

  getPlanningWeights() {
    return this.get(PLANNING_WEIGHTS_KEY, DEFAULT_PLANNING_WEIGHTS);
  }
  setPlanningWeights(weights: Record<string, number>, actorUserId?: string) {
    return this.set(PLANNING_WEIGHTS_KEY, weights, actorUserId);
  }

  getBranding() {
    return this.get(PLATFORM_BRANDING_KEY, DEFAULT_PLATFORM_BRANDING);
  }
  setBranding(branding: Record<string, unknown>, actorUserId?: string) {
    return this.set(PLATFORM_BRANDING_KEY, branding, actorUserId);
  }

  history(key: string) {
    return this.prisma.platformSettingHistory.findMany({ where: { key }, orderBy: { createdAt: "desc" }, take: 20 });
  }
}
