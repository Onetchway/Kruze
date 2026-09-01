import { Injectable, Logger } from "@nestjs/common";

export interface CvrpPoint {
  id: string;
  latitude: number;
  longitude: number;
}

export interface CvrpRoute {
  stopIds: string[];
}

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Client for the real OR-Tools CVRP solver (apps/optimizer-service) —
 * a genuine constraint-programming solve, not the nearest-neighbor/2-opt
 * heuristic in geo-routing.ts. Every failure mode (service down, slow,
 * non-2xx, no feasible solution found) returns null rather than
 * throwing: the caller (PlanningService) always has that heuristic as a
 * fallback, so a daily plan generation is never blocked by this optional
 * service being unavailable — same fire-and-forget-resilience
 * philosophy as the Kafka event backbone (see src/eventbus).
 */
@Injectable()
export class OptimizerClient {
  private readonly logger = new Logger(OptimizerClient.name);
  private readonly baseUrl = process.env.OPTIMIZER_SERVICE_URL ?? "http://localhost:8000";

  async solveCvrp(
    depot: { latitude: number; longitude: number },
    points: CvrpPoint[],
    vehicleCapacity: number,
  ): Promise<CvrpRoute[] | null> {
    if (points.length === 0) {
      return [];
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/solve-cvrp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depot, points, vehicleCapacity }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Optimizer service returned HTTP ${res.status} — falling back to the built-in heuristic`);
        return null;
      }
      const data = (await res.json()) as { solved: boolean; routes: CvrpRoute[] };
      if (!data.solved) {
        this.logger.warn("Optimizer service found no feasible solution — falling back to the built-in heuristic");
        return null;
      }
      return data.routes;
    } catch (err) {
      this.logger.warn(`Optimizer service unreachable — falling back to the built-in heuristic: ${(err as Error).message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
