import { PlatformRole } from "./role";

/**
 * Super Admin role groups (spec §2). KRUZE_SUPER_ADMIN is the legacy/root
 * role and a superset of every capability below, so it is included in
 * every group. READ_ONLY_SUPER_ADMIN is deliberately excluded from every
 * *_WRITE group — it may view but never mutate platform state.
 */
export const SUPER_ADMIN_ROLES: PlatformRole[] = [
  PlatformRole.KRUZE_SUPER_ADMIN,
  PlatformRole.PLATFORM_OWNER,
  PlatformRole.PLATFORM_OPERATIONS_ADMIN,
  PlatformRole.SUPPORT_ADMIN,
  PlatformRole.BILLING_ADMIN,
  PlatformRole.SECURITY_ADMIN,
  PlatformRole.COMPLIANCE_ADMIN,
  PlatformRole.READ_ONLY_SUPER_ADMIN,
];

/** Any super-admin role that is allowed to write, i.e. every one but the read-only role. */
export const SUPER_ADMIN_WRITE_ROLES: PlatformRole[] = SUPER_ADMIN_ROLES.filter(
  (r) => r !== PlatformRole.READ_ONLY_SUPER_ADMIN,
);

/** Tenant lifecycle: create/approve/suspend/reactivate organisations. */
export const TENANT_MANAGEMENT_ROLES: PlatformRole[] = [
  PlatformRole.KRUZE_SUPER_ADMIN,
  PlatformRole.PLATFORM_OWNER,
  PlatformRole.PLATFORM_OPERATIONS_ADMIN,
  PlatformRole.SECURITY_ADMIN,
];

/** Cross-tenant user management: invite/disable/enable/change role/reset MFA. */
export const USER_MANAGEMENT_ROLES: PlatformRole[] = [
  PlatformRole.KRUZE_SUPER_ADMIN,
  PlatformRole.PLATFORM_OWNER,
  PlatformRole.PLATFORM_OPERATIONS_ADMIN,
  PlatformRole.SUPPORT_ADMIN,
];

/** Billing/subscription/plan mutation. */
export const BILLING_ROLES: PlatformRole[] = [
  PlatformRole.KRUZE_SUPER_ADMIN,
  PlatformRole.PLATFORM_OWNER,
  PlatformRole.BILLING_ADMIN,
];

/** Security center + audit administration. */
export const SECURITY_ROLES: PlatformRole[] = [
  PlatformRole.KRUZE_SUPER_ADMIN,
  PlatformRole.PLATFORM_OWNER,
  PlatformRole.SECURITY_ADMIN,
];

/** Compliance rule/document-type/policy administration. */
export const COMPLIANCE_ROLES: PlatformRole[] = [
  PlatformRole.KRUZE_SUPER_ADMIN,
  PlatformRole.PLATFORM_OWNER,
  PlatformRole.COMPLIANCE_ADMIN,
];

export interface PlatformRoleDescriptor {
  role: PlatformRole;
  label: string;
  description: string;
}

/** Human-facing descriptions for the Super Admin role picker in admin-web. */
export const PLATFORM_ROLE_CATALOGUE: PlatformRoleDescriptor[] = [
  { role: PlatformRole.PLATFORM_OWNER, label: "Platform Owner", description: "Full control of the Kruze platform." },
  {
    role: PlatformRole.PLATFORM_OPERATIONS_ADMIN,
    label: "Platform Operations Admin",
    description: "Monitors tenants/system health, investigates failed jobs, manages integrations.",
  },
  {
    role: PlatformRole.SUPPORT_ADMIN,
    label: "Support Admin",
    description: "Investigates customer issues, resets invitations, controlled impersonation.",
  },
  { role: PlatformRole.BILLING_ADMIN, label: "Billing Admin", description: "Manages plans, subscriptions, usage, invoices, revenue reports." },
  {
    role: PlatformRole.SECURITY_ADMIN,
    label: "Security Admin",
    description: "Security events, security policy, audit logs, privileged access.",
  },
  {
    role: PlatformRole.COMPLIANCE_ADMIN,
    label: "Compliance Admin",
    description: "Document types, compliance rules, expiry rules, regulatory configuration.",
  },
  {
    role: PlatformRole.READ_ONLY_SUPER_ADMIN,
    label: "Read-Only Super Admin",
    description: "View-only across organisations, users, subscriptions, analytics, audit.",
  },
];
