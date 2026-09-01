import { OrganisationRole } from "@kruze/domain";

const ROLE_PREFIX: Record<OrganisationRole, string> = {
  [OrganisationRole.KRUZE_PLATFORM]: "KRZ",
  [OrganisationRole.CORPORATE]: "COR",
  [OrganisationRole.FLEET_OPERATOR]: "FOP",
  [OrganisationRole.VENDOR]: "VND",
  [OrganisationRole.SUB_VENDOR]: "VND",
};

/**
 * Human-readable Kruze ID (e.g. KZ-COR-000001). Display/reference only —
 * `sequence` should come from a count/lock taken within the caller's
 * transaction, and this is never treated as an authorization boundary.
 */
export function formatGlobalOrgId(primaryRole: OrganisationRole, sequence: number): string {
  const prefix = ROLE_PREFIX[primaryRole];
  return `KZ-${prefix}-${String(sequence).padStart(6, "0")}`;
}
