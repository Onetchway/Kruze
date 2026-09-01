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

// --- Domain types (the slice the Operator Web surface needs) --------------

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

export interface Trip {
  id: string;
  globalTripId: string;
  status: string;
  scheduledStartAt: string;
}

export interface OrganisationLookup {
  id: string;
  globalOrgId: string;
  displayName: string;
  roles: string[];
  status: string;
}

export interface OrganisationRelationship {
  id: string;
  sourceOrgId: string;
  targetOrgId: string;
  type: string;
  status: string;
  createdAt: string;
  sourceOrg: OrganisationLookup;
  targetOrg: OrganisationLookup;
}

export interface Driver {
  id: string;
  globalDriverId: string;
  fullName: string;
  phone: string;
  licenceNumber: string | null;
  status: string;
}

export interface Guard {
  id: string;
  globalGuardId: string;
  fullName: string;
  phone: string;
  status: string;
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

export interface DriverPaymentVoucher {
  id: string;
  driverId: string;
  driver: Driver;
  periodStart: string;
  periodEnd: string;
  grossAmount: string;
  deductions: string;
  netPayment: string;
  status: string;
  chequeNumber: string | null;
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

  getMyOrganisation: (token: string) => apiFetch<Organisation>("/organisations/me", { token }),
  lookupOrganisation: (token: string, globalOrgId: string) =>
    apiFetch<OrganisationLookup>(`/organisations/lookup?globalOrgId=${encodeURIComponent(globalOrgId)}`, { token }),

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

  listDrivers: (token: string) => apiFetch<Driver[]>("/drivers", { token }),
  createDriver: (token: string, input: { fullName: string; phone: string; licenceNumber?: string }) =>
    apiFetch<Driver>("/drivers", { method: "POST", body: input, token }),

  listGuards: (token: string) => apiFetch<Guard[]>("/guards", { token }),
  createGuard: (token: string, input: { fullName: string; phone: string }) =>
    apiFetch<Guard>("/guards", { method: "POST", body: input, token }),

  listRelationships: (token: string) => apiFetch<OrganisationRelationship[]>("/organisation-relationships", { token }),
  inviteRelationship: (token: string, input: { targetOrgId: string; type: string }) =>
    apiFetch<OrganisationRelationship>("/organisation-relationships", { method: "POST", body: input, token }),
  acceptRelationship: (token: string, relationshipId: string) =>
    apiFetch<OrganisationRelationship>(`/organisation-relationships/${relationshipId}/accept`, { method: "POST", token }),

  listDriverPaymentVouchers: (token: string) => apiFetch<DriverPaymentVoucher[]>("/driver-payment-vouchers", { token }),
  generateDriverPaymentVoucher: (token: string, input: { driverId: string; periodStart: string; periodEnd: string }) =>
    apiFetch<DriverPaymentVoucher>("/driver-payment-vouchers/generate", { method: "POST", body: input, token }),
  lockDriverPaymentVoucher: (token: string, id: string) =>
    apiFetch<DriverPaymentVoucher>(`/driver-payment-vouchers/${id}/lock`, { method: "POST", token }),
};
