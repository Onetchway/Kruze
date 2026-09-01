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
  metadata: {
    employeesRequiringTransport?: number;
    tripsGenerated?: number;
    exceptionsRaised?: number;
    vehiclesRequired?: number;
    driversRequired?: number;
    guardsRequired?: number;
    unassignedEmployees?: number;
  } | null;
}

export interface RosterEntry {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string;
  status: string;
  source: string;
  employee: Employee;
  shift: Shift;
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

export interface CorporateSettings {
  organisationId: string;
  address: string | null;
  contactPersonName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contractStartsAt: string | null;
  contractEndsAt: string | null;
  paymentTerms: string | null;
  employeePickupChangeLimit: number;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface RateCard {
  id: string;
  contractId: string;
  vehicleType: string;
  zoneId: string | null;
  pricingModel: string;
  pricingRules: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
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

export interface Contract {
  id: string;
  corporateOrgId: string;
  vendorOrgId: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  rateCards: RateCard[];
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
  listRosterEntries: (token: string, filters?: { shiftId?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.shiftId) params.set("shiftId", filters.shiftId);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    const qs = params.toString();
    return apiFetch<RosterEntry[]>(`/roster-entries${qs ? `?${qs}` : ""}`, { token });
  },
  bulkUpsertRoster: (token: string, input: { shiftId: string; employeeIds: string[]; dates: string[] }) =>
    apiFetch<unknown>("/roster-entries/bulk", { method: "POST", body: input, token }),
  cancelRosterEntry: (token: string, id: string) =>
    apiFetch<RosterEntry>(`/roster-entries/${id}/cancel`, { method: "POST", token }),

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

  lookupOrganisation: (token: string, globalOrgId: string) =>
    apiFetch<OrganisationLookup>(`/organisations/lookup?globalOrgId=${encodeURIComponent(globalOrgId)}`, { token }),
  getMyOrganisation: (token: string) => apiFetch<Organisation>("/organisations/me", { token }),

  listRelationships: (token: string) => apiFetch<OrganisationRelationship[]>("/organisation-relationships", { token }),
  inviteRelationship: (token: string, input: { targetOrgId: string; type: string }) =>
    apiFetch<OrganisationRelationship>("/organisation-relationships", { method: "POST", body: input, token }),
  acceptRelationship: (token: string, relationshipId: string) =>
    apiFetch<OrganisationRelationship>(`/organisation-relationships/${relationshipId}/accept`, { method: "POST", token }),

  listDrivers: (token: string) => apiFetch<Driver[]>("/drivers", { token }),
  createDriver: (token: string, input: { fullName: string; phone: string; licenceNumber?: string }) =>
    apiFetch<Driver>("/drivers", { method: "POST", body: input, token }),

  getCorporateSettings: (token: string) => apiFetch<CorporateSettings>("/corporate/settings", { token }),
  updateCorporateSettings: (
    token: string,
    input: Partial<
      Pick<
        CorporateSettings,
        | "address"
        | "contactPersonName"
        | "contactEmail"
        | "contactPhone"
        | "contractStartsAt"
        | "contractEndsAt"
        | "paymentTerms"
        | "employeePickupChangeLimit"
      >
    >,
  ) => apiFetch<CorporateSettings>("/corporate/settings", { method: "PUT", body: input, token }),

  employeeSignup: (input: { globalOrgId: string; fullName: string; phone: string; email: string; password: string; department?: string }) =>
    apiFetch<Employee>("/employees/signup", { method: "POST", body: input }),
  listPendingEmployees: (token: string) => apiFetch<Employee[]>("/employees/pending", { token }),
  approveEmployeeSignup: (token: string, id: string, employeeCode?: string) =>
    apiFetch<Employee>(`/employees/${id}/approve`, { method: "POST", body: { employeeCode }, token }),
  rejectEmployeeSignup: (token: string, id: string) =>
    apiFetch<Employee>(`/employees/${id}/reject`, { method: "POST", body: {}, token }),

  listLocations: (token: string) => apiFetch<Location[]>("/locations", { token }),
  createLocation: (
    token: string,
    input: { name: string; code: string; address?: string; city?: string; latitude?: number; longitude?: number },
  ) => apiFetch<Location>("/locations", { method: "POST", body: input, token }),
  removeLocation: (token: string, id: string) => apiFetch<Location>(`/locations/${id}`, { method: "DELETE", token }),

  listZones: (token: string) => apiFetch<Zone[]>("/zones", { token }),
  createZone: (token: string, input: { name: string; code: string }) =>
    apiFetch<Zone>("/zones", { method: "POST", body: input, token }),
  removeZone: (token: string, id: string) => apiFetch<Zone>(`/zones/${id}`, { method: "DELETE", token }),

  listContracts: (token: string) => apiFetch<Contract[]>("/contracts", { token }),
  createContract: (token: string, input: { vendorOrgId: string; startsAt: string; endsAt?: string }) =>
    apiFetch<Contract>("/contracts", { method: "POST", body: input, token }),
  activateContract: (token: string, id: string) =>
    apiFetch<Contract>(`/contracts/${id}/activate`, { method: "POST", token }),
  addRateCard: (
    token: string,
    contractId: string,
    input: {
      vehicleType: string;
      zoneId?: string;
      pricingModel: string;
      pricingRules: Record<string, unknown>;
      effectiveFrom: string;
      effectiveTo?: string;
    },
  ) => apiFetch<RateCard>(`/contracts/${contractId}/rate-cards`, { method: "POST", body: input, token }),

  listDriverPaymentVouchers: (token: string) => apiFetch<DriverPaymentVoucher[]>("/driver-payment-vouchers", { token }),
  generateDriverPaymentVoucher: (token: string, input: { driverId: string; periodStart: string; periodEnd: string }) =>
    apiFetch<DriverPaymentVoucher>("/driver-payment-vouchers/generate", { method: "POST", body: input, token }),
  lockDriverPaymentVoucher: (token: string, id: string) =>
    apiFetch<DriverPaymentVoucher>(`/driver-payment-vouchers/${id}/lock`, { method: "POST", token }),
};
