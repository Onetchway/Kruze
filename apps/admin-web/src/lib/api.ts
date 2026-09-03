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

export interface Organisation {
  id: string;
  globalOrgId: string;
  legalName: string;
  displayName: string;
  roles: string[];
  status: string;
  createdAt: string;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  registrationNumber?: string | null;
  gstin?: string | null;
  pan?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  website?: string | null;
  timezone?: string | null;
  currency?: string | null;
  language?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  fleetSize?: number | null;
  logoUrl?: string | null;
}

export interface AdminCreateOrganisationInput {
  legalName: string;
  displayName: string;
  roles: string[];
  registrationNumber?: string;
  gstin?: string;
  pan?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  industry?: string;
  employeeCount?: number;
  fleetSize?: number;
  logoUrl?: string;
}

export interface OrganisationStats {
  userCount: number;
  employeeCount: number;
  driverRelationshipCount: number;
  vehicleRelationshipCount: number;
  guardRelationshipCount: number;
  activeRelationshipCount: number;
  tripCount: number;
  subscription: Subscription | null;
}

export interface OrganisationMembershipRow {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  user: { id: string; email: string | null; phone: string | null; displayName: string; status: string; mfaEnabled: boolean };
}

export interface OrganisationRelationshipRow {
  id: string;
  type: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  sourceOrg: { id: string; globalOrgId: string; displayName: string; roles: string[] };
  targetOrg: { id: string; globalOrgId: string; displayName: string; roles: string[] };
}

export interface PlatformDashboardOverview {
  organisations: { total: number; byStatus: Record<string, number>; corporate: number; vendor: number; operator: number; activeRelationships: number };
  corporate: { organisations: number; employees: number };
  vendors: { organisations: number; drivers: number; vehicles: number; guards: number };
  platformUsage: {
    totalUsers: number;
    activeMemberships: number;
    drivers: number;
    vehicles: number;
    guards: number;
    employees: number;
    tripsTotal: number;
    tripsScheduledLast24h: number;
    tripsRunningNow: number;
    openExceptions: number;
    openSafetyEvents: number;
  };
  subscription: { byStatus: Record<string, number>; mrrCents: number; mrr: number; activeOrTrialCount: number };
  systemHealth: { eventsConsumedLast24h: number; usageRecordsLast24h: number };
  security: { auditEventsLast24h: number; failedLoginsLast24h: number; suspendedOrganisations: number; roleChangesLast24h: number };
}

export interface PlatformUserRow {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  user: { id: string; email: string | null; phone: string | null; displayName: string; status: string; mfaEnabled: boolean; createdAt: string };
  organisation: { id: string; globalOrgId: string; displayName: string };
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  reason: string | null;
  correlationId: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; email: string | null; displayName: string } | null;
  organisation: { id: string; globalOrgId: string; displayName: string } | null;
}

export interface PlatformPermission {
  action: string;
  description: string;
  roles: string[];
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  features: string[];
  active: boolean;
  monthlyPriceCents?: number;
}

export interface Subscription {
  organisationId: string;
  planId: string;
  status: string;
  startsAt: string;
  trialEndsAt?: string | null;
  endsAt: string | null;
  plan: SubscriptionPlan;
}

export interface UsageRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, number>;
}

export interface PlatformRelationshipRow {
  id: string;
  type: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  sourceOrg: { id: string; globalOrgId: string; displayName: string; roles: string[]; status: string };
  targetOrg: { id: string; globalOrgId: string; displayName: string; roles: string[]; status: string };
  createdBy?: { id: string; email: string | null; displayName: string } | null;
  contract: {
    id: string;
    corporateOrgId: string;
    vendorOrgId: string;
    status: string;
    startsAt: string;
    endsAt: string | null;
    scopeCities: string[];
  } | null;
}

export interface PlatformRelationshipSummary {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface PlatformDriverRow {
  id: string;
  globalDriverId: string;
  fullName: string;
  phone: string;
  status: string;
  createdAt: string;
  vendorRelationships: { id: string; status: string; vendorOrg: { id: string; displayName: string; globalOrgId: string } }[];
}

export interface PlatformVehicleRow {
  id: string;
  globalVehicleId: string;
  registrationNo: string;
  make: string | null;
  model: string | null;
  vehicleType: string | null;
  status: string;
  createdAt: string;
  vendorRelationships: { id: string; status: string; vendorOrg: { id: string; displayName: string; globalOrgId: string } }[];
}

export interface PlatformGuardRow {
  id: string;
  globalGuardId: string;
  fullName: string;
  phone: string;
  status: string;
  createdAt: string;
  vendorRelationships: { id: string; status: string; vendorOrg: { id: string; displayName: string; globalOrgId: string } }[];
}

export interface PlatformFleetSummary {
  drivers: { total: number; byStatus: Record<string, number> };
  vehicles: { total: number; byStatus: Record<string, number> };
  guards: { total: number; byStatus: Record<string, number> };
}

export interface PlatformOperationsOverview {
  todayTripStatusRaw: Record<string, number>;
  liveOperations: {
    planned: number;
    assigned: number;
    driverEnRoute: number;
    pickupStarted: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    exceptions: number;
  };
  planExceptions: { open: number; byType: Record<string, number> };
  sos: { activeTripsInSos: number; openIncidentsByCategory: Record<string, number> };
}

export interface PlatformTripRow {
  id: string;
  globalTripId: string;
  status: string;
  scheduledStartAt: string;
  corporateOrg: { id: string; displayName: string };
  vendorOrg: { id: string; displayName: string } | null;
  assignments: { driver: { fullName: string } | null; vehicle: { registrationNo: string } | null }[];
}

export interface PlatformComplianceOverview {
  documents: {
    byStatus: Record<string, number>;
    byEntityType: Record<string, number>;
    valid: number;
    expiringSoon: number;
    expired: number;
  };
}

export interface PlatformSafetyPolicyRow {
  id: string;
  name: string;
  version: number;
  active: boolean;
  createdAt: string;
  organisation: { id: string; displayName: string; globalOrgId: string };
  rules: { id: string; type: string; config: unknown; mandatory: boolean }[];
}

export interface PlanningWeights {
  safety: number;
  onTime: number;
  rideTime: number;
  utilization: number;
  cost: number;
  routeStability: number;
}

export interface PlatformBranding {
  platformName: string;
  timezone: string;
  currency: string;
  language: string;
  logoUrl: string | null;
}

// --- API calls ----------------------------------------------------------------

export const api = {
  login: (email: string, password: string, organisationId?: string) =>
    apiFetch<LoginResult>("/auth/login", { method: "POST", body: { email, password, organisationId } }),

  listOrganisations: (token: string) => apiFetch<Organisation[]>("/organisations", { token }),
  approveOrganisation: (token: string, id: string) =>
    apiFetch<Organisation>(`/organisations/${id}/approve`, { method: "POST", token }),
  adminCreateOrganisation: (token: string, input: AdminCreateOrganisationInput) =>
    apiFetch<Organisation>("/organisations/admin-create", { method: "POST", body: input, token }),
  getOrganisation: (token: string, id: string) => apiFetch<Organisation>(`/organisations/${id}`, { token }),
  getOrganisationStats: (token: string, id: string) => apiFetch<OrganisationStats>(`/organisations/${id}/stats`, { token }),
  getOrganisationUsers: (token: string, id: string) =>
    apiFetch<OrganisationMembershipRow[]>(`/organisations/${id}/users`, { token }),
  suspendOrganisation: (token: string, id: string, reason: string) =>
    apiFetch<Organisation>(`/organisations/${id}/suspend`, { method: "POST", body: { reason }, token }),
  reactivateOrganisation: (token: string, id: string) =>
    apiFetch<Organisation>(`/organisations/${id}/reactivate`, { method: "POST", token }),

  getOrganisationRelationships: (token: string, id: string) =>
    apiFetch<OrganisationRelationshipRow[]>(`/organisations/${id}/relationships`, { token }),

  getDashboard: (token: string) => apiFetch<PlatformDashboardOverview>("/platform/dashboard", { token }),

  listPlatformUsers: (token: string, params: { organisationId?: string; q?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<PlatformUserRow[]>(`/platform/users${qs ? `?${qs}` : ""}`, { token });
  },
  invitePlatformUser: (token: string, input: { email: string; displayName: string; organisationId: string; role: string }) =>
    apiFetch<{ membership: PlatformUserRow; temporaryPassword: string | null }>("/platform/users/invite", {
      method: "POST",
      body: input,
      token,
    }),
  disablePlatformUser: (token: string, userId: string) =>
    apiFetch(`/platform/users/${userId}/disable`, { method: "POST", token }),
  enablePlatformUser: (token: string, userId: string) =>
    apiFetch(`/platform/users/${userId}/enable`, { method: "POST", token }),
  changeMembershipRole: (token: string, membershipId: string, role: string) =>
    apiFetch(`/platform/users/memberships/${membershipId}/role`, { method: "PATCH", body: { role }, token }),

  getAuditLog: (
    token: string,
    params: { organisationId?: string; action?: string; resourceType?: string; from?: string; to?: string; cursor?: string } = {},
  ) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<{ entries: AuditLogEntry[]; nextCursor: string | null }>(`/platform/audit-log${qs ? `?${qs}` : ""}`, { token });
  },

  getSecurityOverview: (token: string) => apiFetch<Record<string, unknown>>("/platform/security/overview", { token }),

  getPlatformRolePermissions: (token: string) => apiFetch<PlatformPermission[]>("/platform/role-permissions", { token }),

  extendTrial: (token: string, organisationId: string, days: number) =>
    apiFetch<Subscription>(`/subscriptions/organisations/${organisationId}/extend-trial`, { method: "POST", body: { days }, token }),
  resumeSubscription: (token: string, organisationId: string) =>
    apiFetch<Subscription>(`/subscriptions/organisations/${organisationId}/resume`, { method: "POST", token }),
  listUsage: (token: string, organisationId: string) =>
    apiFetch<UsageRecord[]>(`/subscriptions/organisations/${organisationId}/usage`, { token }),

  listPlans: (token: string) => apiFetch<SubscriptionPlan[]>("/subscription-plans", { token }),
  createPlan: (token: string, input: { code: string; name: string; features: string[]; monthlyPriceCents?: number }) =>
    apiFetch<SubscriptionPlan>("/subscription-plans", { method: "POST", body: input, token }),

  getSubscription: (token: string, organisationId: string) =>
    apiFetch<Subscription | null>(`/subscriptions/organisations/${organisationId}`, { token }),
  subscribe: (token: string, organisationId: string, planId: string) =>
    apiFetch<Subscription>("/subscriptions", { method: "POST", body: { organisationId, planId }, token }),
  activateSubscription: (token: string, organisationId: string) =>
    apiFetch<Subscription>(`/subscriptions/organisations/${organisationId}/activate`, { method: "POST", token }),
  suspendSubscription: (token: string, organisationId: string) =>
    apiFetch<Subscription>(`/subscriptions/organisations/${organisationId}/suspend`, { method: "POST", token }),
  cancelSubscription: (token: string, organisationId: string) =>
    apiFetch<Subscription>(`/subscriptions/organisations/${organisationId}/cancel`, { method: "POST", token }),

  // --- Relationships (platform-wide) ---------------------------------------
  listPlatformRelationships: (token: string, params: { type?: string; status?: string; organisationId?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<PlatformRelationshipRow[]>(`/platform/relationships${qs ? `?${qs}` : ""}`, { token });
  },
  getPlatformRelationshipsSummary: (token: string) =>
    apiFetch<PlatformRelationshipSummary>("/platform/relationships/summary", { token }),
  getPlatformRelationship: (token: string, id: string) =>
    apiFetch<PlatformRelationshipRow>(`/platform/relationships/${id}`, { token }),

  // --- Fleet & Resources (platform-wide) -----------------------------------
  getFleetSummary: (token: string) => apiFetch<PlatformFleetSummary>("/platform/fleet/summary", { token }),
  listPlatformDrivers: (token: string, params: { q?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<PlatformDriverRow[]>(`/platform/fleet/drivers${qs ? `?${qs}` : ""}`, { token });
  },
  listPlatformVehicles: (token: string, params: { q?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<PlatformVehicleRow[]>(`/platform/fleet/vehicles${qs ? `?${qs}` : ""}`, { token });
  },
  listPlatformGuards: (token: string, params: { q?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<PlatformGuardRow[]>(`/platform/fleet/guards${qs ? `?${qs}` : ""}`, { token });
  },
  blockDriver: (token: string, id: string) => apiFetch(`/platform/fleet/drivers/${id}/block`, { method: "POST", token }),
  suspendDriver: (token: string, id: string) => apiFetch(`/platform/fleet/drivers/${id}/suspend`, { method: "POST", token }),
  unblockDriver: (token: string, id: string) => apiFetch(`/platform/fleet/drivers/${id}/unblock`, { method: "POST", token }),
  blockVehicle: (token: string, id: string) => apiFetch(`/platform/fleet/vehicles/${id}/block`, { method: "POST", token }),
  unblockVehicle: (token: string, id: string) => apiFetch(`/platform/fleet/vehicles/${id}/unblock`, { method: "POST", token }),
  blockGuard: (token: string, id: string) => apiFetch(`/platform/fleet/guards/${id}/block`, { method: "POST", token }),
  unblockGuard: (token: string, id: string) => apiFetch(`/platform/fleet/guards/${id}/unblock`, { method: "POST", token }),

  // --- Transport Operations (platform-wide) --------------------------------
  getOperationsOverview: (token: string) => apiFetch<PlatformOperationsOverview>("/platform/operations/overview", { token }),
  listPlatformTrips: (token: string, params: { status?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<{ trips: PlatformTripRow[]; nextCursor: string | null }>(`/platform/operations/trips${qs ? `?${qs}` : ""}`, { token });
  },

  // --- Safety & Compliance (platform-wide) ---------------------------------
  getComplianceOverview: (token: string) => apiFetch<PlatformComplianceOverview>("/platform/compliance/overview", { token }),
  listSafetyPolicies: (token: string) => apiFetch<PlatformSafetyPolicyRow[]>("/platform/compliance/safety-policies", { token }),

  // --- Planning & Automation / Platform Settings ---------------------------
  getPlanningWeights: (token: string) => apiFetch<PlanningWeights>("/platform/settings/planning-weights", { token }),
  setPlanningWeights: (token: string, weights: PlanningWeights) =>
    apiFetch<PlanningWeights>("/platform/settings/planning-weights", { method: "PUT", body: weights, token }),
  getPlatformBranding: (token: string) => apiFetch<PlatformBranding>("/platform/settings/branding", { token }),
  setPlatformBranding: (token: string, branding: PlatformBranding) =>
    apiFetch<PlatformBranding>("/platform/settings/branding", { method: "PUT", body: branding, token }),
};
