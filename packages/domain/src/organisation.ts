/**
 * An organisation may carry more than one business role simultaneously
 * (e.g. a Fleet Operator that is also a Vendor), so this is a role tag
 * set, not a mutually-exclusive type discriminator.
 */
export enum OrganisationRole {
  KRUZE_PLATFORM = "KRUZE_PLATFORM",
  CORPORATE = "CORPORATE",
  FLEET_OPERATOR = "FLEET_OPERATOR",
  VENDOR = "VENDOR",
  SUB_VENDOR = "SUB_VENDOR",
}

export enum OrganisationStatus {
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  TERMINATED = "TERMINATED",
}

/**
 * Organisations are connected by explicit relationship records, never by a
 * rigid parent-child tree, so authorization can be derived from the
 * relationship's own status instead of a fixed hierarchy position.
 */
export enum OrganisationRelationshipType {
  KRUZE_TENANCY = "KRUZE_TENANCY",
  OPERATOR_MANAGES_CORPORATE = "OPERATOR_MANAGES_CORPORATE",
  CORPORATE_VENDOR = "CORPORATE_VENDOR",
  VENDOR_SUB_VENDOR = "VENDOR_SUB_VENDOR",
}

export enum OrganisationRelationshipStatus {
  INVITED = "INVITED",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  TERMINATED = "TERMINATED",
  REJECTED = "REJECTED",
}
