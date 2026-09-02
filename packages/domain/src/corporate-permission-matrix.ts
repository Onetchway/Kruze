import { PlatformRole } from "./role";

/**
 * The corporate role/permission matrix, kept as one explicit source of
 * truth rather than left implicit in each controller's @Roles() list.
 * This mirrors the real guard configuration as of the roles it names —
 * when a controller's roles change, this list should change with it.
 */
export interface CorporatePermission {
  action: string;
  description: string;
  roles: PlatformRole[];
}

const {
  CORPORATE_TRANSPORT_ADMIN: ADMIN,
  CORPORATE_TRANSPORT_MANAGER: MANAGER,
  CORPORATE_TRANSPORT_SUPERVISOR: SUPERVISOR,
  CORPORATE_MANAGEMENT: MANAGEMENT,
  CORPORATE_HR: HR,
  CORPORATE_FINANCE: FINANCE,
  CORPORATE_SAFETY_COMPLIANCE: SAFETY_COMPLIANCE,
  AUDITOR,
} = PlatformRole;

export const CORPORATE_PERMISSION_MATRIX: CorporatePermission[] = [
  { action: "View settings, users, analytics, compliance", description: "Read-only access across the portal", roles: [ADMIN, MANAGER, SUPERVISOR, MANAGEMENT, HR, FINANCE, SAFETY_COMPLIANCE, AUDITOR] },
  { action: "Manage employees (create/approve/deactivate)", description: "Employee roster admin", roles: [ADMIN, MANAGER, SUPERVISOR, HR] },
  { action: "Manage shifts", description: "Create shifts", roles: [ADMIN, MANAGER, SUPERVISOR] },
  { action: "Bulk-roster employees", description: "Roster creation", roles: [ADMIN, MANAGER, SUPERVISOR] },
  { action: "Generate / publish transport plans", description: "Auto-plan", roles: [ADMIN, MANAGER, SUPERVISOR] },
  { action: "Manage drop locations", description: "Add locations", roles: [ADMIN, MANAGER, SUPERVISOR] },
  { action: "Delete drop locations", description: "Remove locations", roles: [ADMIN, MANAGER] },
  { action: "Manage zones", description: "Add/remove service zones", roles: [ADMIN, MANAGER] },
  { action: "Create / activate contracts", description: "Commercial agreements", roles: [ADMIN, FINANCE] },
  { action: "Create invoices, approve invoice lines/whole invoice", description: "Financial approval", roles: [ADMIN, FINANCE] },
  { action: "Manage safety policies", description: "Female Safety, guard-required, ride-time rules", roles: [ADMIN, SAFETY_COMPLIANCE] },
  { action: "Manage compliance rules", description: "Required-document policy", roles: [ADMIN, SAFETY_COMPLIANCE] },
  { action: "Invite / suspend team members", description: "Users & Roles", roles: [ADMIN] },
  { action: "Edit corporate settings (company/contract/policy)", description: "Settings writes", roles: [ADMIN] },
];
