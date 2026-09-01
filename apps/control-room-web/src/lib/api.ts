const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/v1";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = Array.isArray(payload.message) ? payload.message.join(", ") : payload.message;
    throw new ApiError(res.status, message ?? res.statusText);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

// --- Domain types -----------------------------------------------------------

export interface LoginResult {
  accessToken?: string;
  organisationId?: string;
  role?: string;
  requiresOrganisationSelection?: boolean;
  organisations?: { organisationId: string; role: string }[];
}

const LIVE_TRIP_STATUSES = ["RESOURCES_ASSIGNED", "RUNNING", "SOS_ACTIVE", "BREAKDOWN", "REASSIGNING"];
export { LIVE_TRIP_STATUSES };

export interface Trip {
  id: string;
  globalTripId: string;
  status: string;
  scheduledStartAt: string;
  actualStartAt: string | null;
  actualEndAt: string | null;
  estimatedDistanceKm: number | null;
  actualDistanceKm: number | null;
}

export interface TripEmployee {
  id: string;
  tripId: string;
  employeeId: string;
  status: string;
  pickupVerifiedAt: string | null;
  dropVerifiedAt: string | null;
}

export interface TripAssignment {
  id: string;
  tripId: string;
  driverId: string | null;
  vehicleId: string | null;
  guardId: string | null;
  status: string;
  source: string;
}

export interface TripEvent {
  id: string;
  tripId: string;
  type: string;
  createdAt: string;
  metadata: unknown;
}

export interface TripDetail extends Trip {
  employees: TripEmployee[];
  assignments: TripAssignment[];
  events: TripEvent[];
}

export interface LocationPing {
  id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  recordedAt: string;
}

export interface Incident {
  id: string;
  tripId: string | null;
  category: string;
  severity: string;
  status: string;
  description: string | null;
  correctiveAction: string | null;
  createdAt: string;
  closedAt: string | null;
}

export interface Driver {
  id: string;
  globalDriverId: string;
  fullName: string;
  phone: string;
  status: string;
}

export interface Vehicle {
  id: string;
  globalVehicleId: string;
  registrationNo: string;
  vehicleType: string | null;
  status: string;
}

// --- API calls ----------------------------------------------------------------

export const api = {
  login: (email: string, password: string, organisationId?: string) =>
    apiFetch<LoginResult>("/auth/login", { method: "POST", body: { email, password, organisationId } }),

  listTrips: (token: string) => apiFetch<Trip[]>("/trips", { token }),
  getTrip: (token: string, id: string) => apiFetch<TripDetail>(`/trips/${id}`, { token }),

  latestLocation: (token: string, tripId: string) => apiFetch<LocationPing | null>(`/tracking/trips/${tripId}/latest`, { token }),

  listIncidents: (token: string, status?: string) =>
    apiFetch<Incident[]>(`/incidents${status ? `?status=${status}` : ""}`, { token }),
  closeIncident: (token: string, id: string, correctiveAction: string) =>
    apiFetch<Incident>(`/incidents/${id}/close`, { method: "POST", body: { correctiveAction }, token }),

  reportBreakdown: (token: string, tripId: string, description?: string) =>
    apiFetch<{ trip: Trip; incident: Incident }>(`/trips/${tripId}/breakdown`, { method: "POST", body: { description }, token }),
  replaceResource: (token: string, tripId: string, input: { driverId?: string; vehicleId?: string }) =>
    apiFetch<TripAssignment>(`/trips/${tripId}/replace`, { method: "POST", body: input, token }),

  overrideOtp: (token: string, otpChallengeId: string, reason: string) =>
    apiFetch<{ overridden: boolean }>(`/otp-challenges/${otpChallengeId}/override`, { method: "POST", body: { reason }, token }),

  listDrivers: (token: string) => apiFetch<Driver[]>("/drivers", { token }),
  listVehicles: (token: string) => apiFetch<Vehicle[]>("/vehicles", { token }),
};
