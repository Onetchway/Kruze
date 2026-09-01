import { haversineDistanceMeters } from "../tracking/geo.util";

export interface RoutablePoint {
  employeeId: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Groups employees into vehicle-capacity-constrained clusters by home
 * proximity (greedy nearest-neighbor clustering), instead of arbitrary
 * roster-order chunking. Still a heuristic, not an exact solver — but it's
 * geography-aware, which the previous `chunk()` grouping was not at all.
 *
 * Falls back to simple fixed-size chunking (roster order) whenever any
 * employee in the input is missing home coordinates, since distance can't
 * be computed for them — a corporate that hasn't captured employee home
 * locations degrades gracefully rather than crashing (same pattern as
 * safety policies: no configured data means no extra behavior, not an
 * error).
 */
export function clusterByProximity<T extends RoutablePoint>(employees: T[], maxGroupSize: number): T[][] {
  if (employees.length === 0) {
    return [];
  }
  const hasAllCoordinates = employees.every((e) => e.latitude !== null && e.longitude !== null);
  if (!hasAllCoordinates) {
    return chunk(employees, maxGroupSize);
  }

  const remaining = new Set(employees.map((_, i) => i));
  const clusters: T[][] = [];

  while (remaining.size > 0) {
    const seedIdx = remaining.values().next().value as number;
    remaining.delete(seedIdx);
    const cluster: T[] = [employees[seedIdx]];

    while (cluster.length < maxGroupSize && remaining.size > 0) {
      let nearestIdx = -1;
      let nearestDistance = Infinity;
      for (const idx of remaining) {
        const distance = minDistanceToCluster(employees[idx], cluster);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIdx = idx;
        }
      }
      cluster.push(employees[nearestIdx]);
      remaining.delete(nearestIdx);
    }

    clusters.push(cluster);
  }

  return clusters;
}

function minDistanceToCluster(point: RoutablePoint, cluster: RoutablePoint[]): number {
  let min = Infinity;
  for (const member of cluster) {
    const distance = haversineDistanceMeters(
      { latitude: point.latitude!, longitude: point.longitude! },
      { latitude: member.latitude!, longitude: member.longitude! },
    );
    if (distance < min) min = distance;
  }
  return min;
}

/**
 * Orders a group's stops to approximately minimize total pickup route
 * distance: nearest-neighbor construction, then 2-opt local search until
 * no crossing-edge swap improves the tour length. Returns the input array
 * reordered — unchanged (roster order) if coordinates are missing.
 */
export function orderRouteByDistance<T extends RoutablePoint>(points: T[]): T[] {
  if (points.length <= 2 || points.some((p) => p.latitude === null || p.longitude === null)) {
    return points;
  }

  const n = points.length;
  const dist = (i: number, j: number) =>
    haversineDistanceMeters(
      { latitude: points[i].latitude!, longitude: points[i].longitude! },
      { latitude: points[j].latitude!, longitude: points[j].longitude! },
    );

  // Nearest-neighbor construction.
  const visited = new Array(n).fill(false);
  const order = [0];
  visited[0] = true;
  for (let step = 1; step < n; step++) {
    const last = order[order.length - 1];
    let nearest = -1;
    let nearestDistance = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && dist(last, j) < nearestDistance) {
        nearestDistance = dist(last, j);
        nearest = j;
      }
    }
    order.push(nearest);
    visited[nearest] = true;
  }

  // 2-opt: repeatedly reverse a segment if it shortens the tour, until no improvement.
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const a = order[i];
        const b = order[i + 1];
        const c = order[j];
        const d = order[j + 1 < n ? j + 1 : j];
        const before = dist(a, b) + (j + 1 < n ? dist(c, d) : 0);
        const after = dist(a, c) + (j + 1 < n ? dist(b, d) : 0);
        if (after < before) {
          reverseSegment(order, i + 1, j);
          improved = true;
        }
      }
    }
  }

  return order.map((idx) => points[idx]);
}

function reverseSegment(order: number[], start: number, end: number) {
  while (start < end) {
    [order[start], order[end]] = [order[end], order[start]];
    start += 1;
    end -= 1;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
