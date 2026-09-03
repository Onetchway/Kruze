import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from "./dto/feature-flag.dto";

/**
 * Default global flags (spec §62 feature list). AI/prediction-shaped
 * features default OFF (nothing generates predictions yet in this
 * environment, so shipping them "on" would be a silent lie); everything
 * else — already-functioning or purely additive UI/module toggles —
 * defaults ON, matching how the rest of the platform behaves today absent
 * a flag at all.
 */
const DEFAULT_FLAGS: { key: string; name: string; description: string; enabled: boolean }[] = [
  { key: "auto_optimization", name: "Auto Optimization", description: "Automatic route/roster optimisation run.", enabled: true },
  { key: "ev_optimization", name: "EV Optimization", description: "EV-aware routing and charging-window planning.", enabled: true },
  { key: "guard_module", name: "Guard Module", description: "Security guard assignment and tracking module.", enabled: true },
  { key: "advanced_safety", name: "Advanced Safety", description: "Extended safety rule set and SOS escalation flows.", enabled: true },
  { key: "ai_route_prediction", name: "AI Route Prediction", description: "Predictive ETA/route suggestions — no prediction model is wired up yet.", enabled: false },
  { key: "advanced_analytics", name: "Advanced Analytics", description: "Deeper cross-tenant analytics and cost-driver breakdowns.", enabled: true },
  { key: "whatsapp", name: "WhatsApp", description: "WhatsApp Business API as a notification channel.", enabled: true },
  { key: "hrms_integration", name: "HRMS Integration", description: "Employee master-data sync from a corporate's HRMS.", enabled: true },
  { key: "new_mobile_ui", name: "New Mobile UI", description: "Updated employee/driver mobile app UI.", enabled: false },
];

/**
 * Simple on/off feature flags (spec §62) — no percentage rollout, no
 * scheduled activation, and not read by any other module's behaviour this
 * pass: visibility/toggle only, a Super Admin config surface.
 */
@Injectable()
export class PlatformFeatureFlagService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Postgres does not treat NULL as equal to NULL for a unique index, so the
    // (key, organisationId) constraint alone does not stop two concurrent
    // instances from both inserting the same global (organisationId: null)
    // flag — guard with a find-then-create-or-ignore instead, tolerating a
    // races-lost create rather than crashing startup.
    for (const flag of DEFAULT_FLAGS) {
      const existing = await this.prisma.featureFlag.findFirst({ where: { key: flag.key, organisationId: null } });
      if (existing) continue;
      try {
        await this.prisma.featureFlag.create({
          data: { key: flag.key, name: flag.name, description: flag.description, scope: "GLOBAL", enabled: flag.enabled },
        });
      } catch {
        // Lost a startup race to another instance seeding the same default flag — fine, it exists now.
      }
    }
  }

  list(params: { organisationId?: string } = {}) {
    return this.prisma.featureFlag.findMany({
      where: params.organisationId ? { OR: [{ organisationId: params.organisationId }, { scope: "GLOBAL" }] } : {},
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException("Feature flag not found");
    return flag;
  }

  create(dto: CreateFeatureFlagDto) {
    return this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        scope: (dto.scope ?? "GLOBAL") as never,
        organisationId: dto.organisationId,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFeatureFlagDto) {
    await this.get(id);
    return this.prisma.featureFlag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
  }

  async toggle(id: string) {
    const flag = await this.get(id);
    return this.prisma.featureFlag.update({ where: { id }, data: { enabled: !flag.enabled } });
  }
}
