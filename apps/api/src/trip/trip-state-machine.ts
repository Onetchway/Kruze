import { TripStatus } from "../../generated/prisma";

/**
 * CREATED -> SCHEDULED -> RESOURCES_ASSIGNED -> DRIVER_ACCEPTED ->
 * EN_ROUTE_TO_FIRST_PICKUP -> RUNNING -> COMPLETED, with CANCELLED /
 * NO_SHOW / BREAKDOWN / SOS_ACTIVE / PAUSED / REASSIGNING / FAILED as
 * alternate terminal/intermediate states (spec §9 Trip State Machine).
 * Every transition must be validated server-side — invalid transitions are
 * rejected, never silently coerced.
 */
const TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  CREATED: ["SCHEDULED", "CANCELLED", "FAILED"],
  SCHEDULED: ["RESOURCES_ASSIGNED", "CANCELLED", "FAILED"],
  RESOURCES_ASSIGNED: ["DRIVER_ACCEPTED", "REASSIGNING", "CANCELLED", "FAILED"],
  DRIVER_ACCEPTED: ["EN_ROUTE_TO_FIRST_PICKUP", "REASSIGNING", "CANCELLED", "FAILED"],
  EN_ROUTE_TO_FIRST_PICKUP: ["RUNNING", "NO_SHOW", "BREAKDOWN", "SOS_ACTIVE", "CANCELLED"],
  RUNNING: ["COMPLETED", "NO_SHOW", "BREAKDOWN", "SOS_ACTIVE", "PAUSED", "CANCELLED"],
  PAUSED: ["RUNNING", "BREAKDOWN", "SOS_ACTIVE", "CANCELLED"],
  REASSIGNING: ["RESOURCES_ASSIGNED", "CANCELLED", "FAILED"],
  BREAKDOWN: ["REASSIGNING", "CANCELLED"],
  SOS_ACTIVE: ["RUNNING", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  FAILED: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: TripStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
