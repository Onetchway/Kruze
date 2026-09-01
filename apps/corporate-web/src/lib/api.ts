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

// --- Domain types (the slice the Corporate Web surface needs) -------------

export interface LoginResult {
  accessToken?: string;
  organisationId?: string;
  role?: string;
  requiresOrganisationSelection?: boolean;
  organisations?: { organisationId: string; role: string }[];
}

export interface Organisation {
  id: string;
  globalOrgId: string;
  legalName: string;
  displayName: string;
  roles: string[];
  status: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  pickupWindowMinutes: number;
  cutoffMinutesBeforeStart: number;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  department: string | null;
  status: string;
}

export interface TransportPlan {
  id: string;
  status: string;
  version: number;
  planDate: string;
  metadata: { employeesRequiringTransport?: number; tripsGenerated?: number; exceptionsRaised?: number } | null;
}

export interface PlanException {
  id: string;
  type: string;
  status: string;
  context: unknown;
  createdAt: string;
}

export interface Trip {
  id: string;
  globalTripId: string;
  status: string;
  scheduledStartAt: string;
}

export interface Vehicle {
  id: string;
  globalVehicleId: string;
  registrationNo: string;
  make: string | null;
  model: string | null;
  vehicleType: string | null;
  capacity: number | null;
  fuelType: string | null;
  status: string;
  isElectric: boolean;
  batteryCapacityKwh: number | null;
  rangeKm: number | null;
}

// --- API calls --------------------------------------------------------------

export const api = {
  login: (email: string, password: string, organisationId?: string) =>
    apiFetch<LoginResult>("/auth/login", { method: "POST", body: { email, password, organisationId } }),

  register: (input: {
    email: string;
    password: string;
    displayName: string;
    organisationLegalName: string;
    organisationDisplayName: string;
    organisationRole: string;
  }) => apiFetch<Required<Pick<LoginResult, "accessToken" | "organisationId" | "role">>>("/auth/register", { method: "POST", body: input }),

  listShifts: (token: string) => apiFetch<Shift[]>("/shifts", { token }),
  createShift: (token: string, input: { name: string; startTime: string; endTime: string }) =>
    apiFetch<Shift>("/shifts", { method: "POST", body: input, token }),

  listEmployees: (token: string) => apiFetch<Employee[]>("/employees", { token }),
  createEmployee: (
    token: string,
    input: { employeeCode: string; fullName: string; phone: string; department?: string; shiftId?: string },
  ) => apiFetch<Employee>("/employees", { method: "POST", body: input, token }),

  upsertRosterEntry: (
    token: string,
    input: { employeeId: string; shiftId: string; date: string; status: string },
  ) => apiFetch<unknown>("/roster-entries", { method: "POST", body: input, token }),

  generatePlan: (token: string, input: { shiftId: string; planDate: string }) =>
    apiFetch<TransportPlan>("/plans/generate", { method: "POST", body: input, token }),
  planExceptions: (token: string, planId: string) => apiFetch<PlanException[]>(`/plans/${planId}/exceptions`, { token }),
  publishPlan: (token: string, planId: string) => apiFetch<TransportPlan>(`/plans/${planId}/publish`, { method: "POST", token }),

  listTrips: (token: string) => apiFetch<Trip[]>("/trips", { token }),

  listVehicles: (token: string) => apiFetch<Vehicle[]>("/vehicles", { token }),
  createVehicle: (
    token: string,
    input: {
      registrationNo: string;
      make?: string;
      model?: string;
      vehicleType?: string;
      capacity?: number;
      fuelType?: string;
      isElectric?: boolean;
      batteryCapacityKwh?: number;
      rangeKm?: number;
    },
  ) => apiFetch<Vehicle>("/vehicles", { method: "POST", body: input, token }),
};
