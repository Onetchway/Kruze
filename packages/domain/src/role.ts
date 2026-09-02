/**
 * Platform-defined role catalogue (§22 Role Matrix). Roles are granted per
 * organisation membership, never globally, and are combined at
 * authorization time with relationship and attribute context (see
 * @kruze/domain authz types) rather than being sufficient on their own.
 */
export enum PlatformRole {
  /** Legacy/root super-admin role — treated as a superset of every platform role below. */
  KRUZE_SUPER_ADMIN = "KRUZE_SUPER_ADMIN",
  /** Full platform control: orgs, subscriptions, admins, policies, integrations, security, audit (spec §2.1). */
  PLATFORM_OWNER = "PLATFORM_OWNER",
  /** Tenant/system health monitoring, failed jobs, support cases, integrations — no billing/security-architecture changes (spec §2.2). */
  PLATFORM_OPERATIONS_ADMIN = "PLATFORM_OPERATIONS_ADMIN",
  /** Customer config, user problem investigation, invitation resets, support cases (spec §2.3). */
  SUPPORT_ADMIN = "SUPPORT_ADMIN",
  /** SaaS plans, subscriptions, usage, invoices, credits, revenue reports (spec §2.4). */
  BILLING_ADMIN = "BILLING_ADMIN",
  /** Security events, security policy, audit, privileged access, MFA/SSO policy (spec §2.5). */
  SECURITY_ADMIN = "SECURITY_ADMIN",
  /** Document types, compliance rules, expiry rules, verification requirements (spec §2.6). */
  COMPLIANCE_ADMIN = "COMPLIANCE_ADMIN",
  /** View-only across organisations/users/subscriptions/analytics/system health/audit (spec §2.7). */
  READ_ONLY_SUPER_ADMIN = "READ_ONLY_SUPER_ADMIN",
  TENANT_ADMIN = "TENANT_ADMIN",
  CORPORATE_TRANSPORT_ADMIN = "CORPORATE_TRANSPORT_ADMIN",
  CORPORATE_TRANSPORT_MANAGER = "CORPORATE_TRANSPORT_MANAGER",
  CORPORATE_TRANSPORT_SUPERVISOR = "CORPORATE_TRANSPORT_SUPERVISOR",
  CORPORATE_MANAGEMENT = "CORPORATE_MANAGEMENT",
  CORPORATE_HR = "CORPORATE_HR",
  CORPORATE_FINANCE = "CORPORATE_FINANCE",
  CORPORATE_SAFETY_COMPLIANCE = "CORPORATE_SAFETY_COMPLIANCE",
  FLEET_OPERATOR_ADMIN = "FLEET_OPERATOR_ADMIN",
  VENDOR_ADMIN = "VENDOR_ADMIN",
  SUPERVISOR_DISPATCHER = "SUPERVISOR_DISPATCHER",
  DRIVER = "DRIVER",
  GUARD = "GUARD",
  EMPLOYEE = "EMPLOYEE",
  AUDITOR = "AUDITOR",
}
