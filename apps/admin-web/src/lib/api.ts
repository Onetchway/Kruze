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
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  features: string[];
  active: boolean;
}

export interface Subscription {
  organisationId: string;
  planId: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  plan: SubscriptionPlan;
}

// --- API calls ----------------------------------------------------------------

export const api = {
  login: (email: string, password: string, organisationId?: string) =>
    apiFetch<LoginResult>("/auth/login", { method: "POST", body: { email, password, organisationId } }),

  listOrganisations: (token: string) => apiFetch<Organisation[]>("/organisations", { token }),
  approveOrganisation: (token: string, id: string) =>
    apiFetch<Organisation>(`/organisations/${id}/approve`, { method: "POST", token }),

  listPlans: (token: string) => apiFetch<SubscriptionPlan[]>("/subscription-plans", { token }),
  createPlan: (token: string, input: { code: string; name: string; features: string[] }) =>
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
};
