// On a real device this must be the API host's LAN IP (localhost only
// resolves inside the simulator/web preview, not on a physical phone) —
// override via EXPO_PUBLIC_API_BASE_URL at build/start time.
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/v1";

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

export interface LoginResult {
  accessToken?: string;
  organisationId?: string;
  role?: string;
  requiresOrganisationSelection?: boolean;
}

export interface Guard {
  id: string;
  globalGuardId: string;
  fullName: string;
  phone: string;
  status: string;
}

export interface Trip {
  id: string;
  globalTripId: string;
  status: string;
  scheduledStartAt: string;
}

export interface TripAssignmentEntry {
  id: string;
  status: string;
  trip: Trip;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<LoginResult>("/auth/login", { method: "POST", body: { email, password } }),

  claimAccount: (input: { globalGuardId: string; phone: string; email: string; password: string }) =>
    apiFetch<LoginResult>("/guards/claim-account", { method: "POST", body: input }),

  getOwnProfile: (token: string) => apiFetch<Guard>("/guards/me", { token }),
  myTripsToday: (token: string) => apiFetch<TripAssignmentEntry[]>("/guards/me/trips/today", { token }),

  raiseSos: (token: string, tripId: string, description?: string) =>
    apiFetch<{ id: string }>("/sos", { method: "POST", body: { tripId, description }, token }),
};
