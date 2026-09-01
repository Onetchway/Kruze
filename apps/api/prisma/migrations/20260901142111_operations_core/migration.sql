-- CreateEnum
CREATE TYPE "ComplianceSubjectType" AS ENUM ('DRIVER', 'VEHICLE', 'GUARD', 'VENDOR');

-- CreateEnum
CREATE TYPE "ComplianceScope" AS ENUM ('GLOBAL', 'VENDOR', 'CORPORATE', 'TRIP');

-- CreateEnum
CREATE TYPE "ComplianceSeverity" AS ENUM ('WARNING', 'BLOCKING');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'COMPLIANT', 'EXPIRING', 'NON_COMPLIANT', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RosterEntryStatus" AS ENUM ('OPTED_IN', 'OPTED_OUT', 'CANCELLED', 'PLANNED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'OPTIMIZING', 'VALIDATING', 'EXCEPTIONS', 'READY', 'PUBLISHED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('NO_ELIGIBLE_VEHICLE', 'NO_ELIGIBLE_DRIVER', 'NO_GUARD_AVAILABLE', 'CAPACITY_SHORTAGE', 'COMPLIANCE_BLOCK', 'SAFETY_RULE_IMPOSSIBLE', 'MAX_RIDE_TIME_EXCEEDED', 'VENDOR_CAPACITY_EXHAUSTED', 'CONTRACT_RATE_MISSING', 'CONFLICTING_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'RESOLVED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('CREATED', 'SCHEDULED', 'RESOURCES_ASSIGNED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_FIRST_PICKUP', 'RUNNING', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'BREAKDOWN', 'SOS_ACTIVE', 'PAUSED', 'REASSIGNING', 'FAILED');

-- CreateEnum
CREATE TYPE "TripEmployeeStatus" AS ENUM ('PLANNED', 'NOTIFIED', 'VEHICLE_ARRIVING', 'PICKUP_VERIFIED', 'ONBOARD', 'DROP_VERIFIED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'MISSED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('AUTO', 'MANUAL', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SafetyRuleType" AS ENUM ('LAST_DROP_RESTRICTION', 'GUARD_REQUIRED', 'MAX_RIDE_TIME', 'ROUTE_DEVIATION_THRESHOLD', 'UNEXPECTED_STOP', 'GPS_LOSS', 'OVERSPEED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('PICKUP', 'DROP');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'LOCKED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'SMS', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('ACCIDENT', 'SOS', 'BREAKDOWN', 'MISCONDUCT', 'COMPLAINT', 'ROUTE_DEVIATION', 'VEHICLE_ISSUE', 'SAFETY_VIOLATION', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'ACTION_TAKEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DISPUTED', 'PAID');

-- CreateEnum
CREATE TYPE "InvoiceLineStatus" AS ENUM ('PENDING', 'MATCHED', 'VARIANCE', 'DISPUTED', 'APPROVED');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "entityType" "ComplianceSubjectType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rules" (
    "id" TEXT NOT NULL,
    "scope" "ComplianceScope" NOT NULL,
    "scopeOrgId" TEXT,
    "subjectType" "ComplianceSubjectType" NOT NULL,
    "docType" TEXT NOT NULL,
    "maxExpiryGraceDays" INTEGER NOT NULL DEFAULT 0,
    "severity" "ComplianceSeverity" NOT NULL DEFAULT 'BLOCKING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_evaluations" (
    "id" TEXT NOT NULL,
    "subjectType" "ComplianceSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "compliance_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "vendorOrgId" TEXT NOT NULL,
    "organisationRelationshipId" TEXT,
    "scopeCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "slaTargets" JSONB,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_cards" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "pricingModel" TEXT NOT NULL,
    "pricingRules" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "department" TEXT,
    "costCentre" TEXT,
    "homeLatitude" DOUBLE PRECISION,
    "homeLongitude" DOUBLE PRECISION,
    "officeLabel" TEXT,
    "shiftId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "pickupWindowMinutes" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_entries" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "RosterEntryStatus" NOT NULL DEFAULT 'OPTED_IN',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_plans" (
    "id" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "planDate" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "supersedesPlanId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_exceptions" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "context" JSONB,
    "resolvedByUserId" TEXT,
    "resolutionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "plan_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "globalTripId" TEXT NOT NULL,
    "planId" TEXT,
    "corporateOrgId" TEXT NOT NULL,
    "vendorOrgId" TEXT,
    "contractId" TEXT,
    "shiftId" TEXT NOT NULL,
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "status" "TripStatus" NOT NULL DEFAULT 'CREATED',
    "estimatedDistanceKm" DOUBLE PRECISION,
    "actualDistanceKm" DOUBLE PRECISION,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_stops" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "stopType" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "plannedEta" TIMESTAMP(3),
    "actualArrivalAt" TIMESTAMP(3),

    CONSTRAINT "trip_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_employees" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "pickupStopId" TEXT,
    "status" "TripEmployeeStatus" NOT NULL DEFAULT 'PLANNED',
    "pickupVerifiedAt" TIMESTAMP(3),
    "dropVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_assignments" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "guardId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "AssignmentSource" NOT NULL DEFAULT 'AUTO',
    "overrideReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_events" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "location" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_policies" (
    "id" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_rules" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "type" "SafetyRuleType" NOT NULL,
    "config" JSONB NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_events" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "policyVersion" INTEGER,
    "inputContext" JSONB,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "tripEmployeeId" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "status" "OtpStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_events" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'DRIVER_APP',
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "centerLatitude" DOUBLE PRECISION NOT NULL,
    "centerLongitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "corporateOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geofences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "event" TEXT NOT NULL,
    "tripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "category" "IncidentCategory" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "reportedByUserId" TEXT,
    "description" TEXT,
    "location" JSONB,
    "correctiveAction" TEXT,
    "closedByUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_charges" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "rateCardId" TEXT,
    "pricingInputs" JSONB,
    "corporateCharge" DECIMAL(12,2) NOT NULL,
    "vendorPayable" DECIMAL(12,2) NOT NULL,
    "taxes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penalties" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "vendorOrgId" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "claimedTotal" DECIMAL(14,2),
    "validatedTotal" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tripId" TEXT,
    "claimedAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "varianceAmount" DECIMAL(12,2),
    "status" "InvoiceLineStatus" NOT NULL DEFAULT 'PENDING',
    "disputeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_entityType_entityId_idx" ON "documents"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "compliance_rules_subjectType_scope_scopeOrgId_active_idx" ON "compliance_rules"("subjectType", "scope", "scopeOrgId", "active");

-- CreateIndex
CREATE INDEX "compliance_evaluations_subjectType_subjectId_evaluatedAt_idx" ON "compliance_evaluations"("subjectType", "subjectId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "contracts_corporateOrgId_idx" ON "contracts"("corporateOrgId");

-- CreateIndex
CREATE INDEX "contracts_vendorOrgId_idx" ON "contracts"("vendorOrgId");

-- CreateIndex
CREATE INDEX "rate_cards_contractId_vehicleType_effectiveFrom_idx" ON "rate_cards"("contractId", "vehicleType", "effectiveFrom");

-- CreateIndex
CREATE INDEX "employees_corporateOrgId_status_idx" ON "employees"("corporateOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_corporateOrgId_employeeCode_key" ON "employees"("corporateOrgId", "employeeCode");

-- CreateIndex
CREATE INDEX "shifts_corporateOrgId_active_idx" ON "shifts"("corporateOrgId", "active");

-- CreateIndex
CREATE INDEX "roster_entries_shiftId_date_status_idx" ON "roster_entries"("shiftId", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "roster_entries_employeeId_shiftId_date_key" ON "roster_entries"("employeeId", "shiftId", "date");

-- CreateIndex
CREATE INDEX "transport_plans_corporateOrgId_shiftId_planDate_version_idx" ON "transport_plans"("corporateOrgId", "shiftId", "planDate", "version");

-- CreateIndex
CREATE INDEX "plan_exceptions_planId_status_idx" ON "plan_exceptions"("planId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trips_globalTripId_key" ON "trips"("globalTripId");

-- CreateIndex
CREATE INDEX "trips_corporateOrgId_status_idx" ON "trips"("corporateOrgId", "status");

-- CreateIndex
CREATE INDEX "trips_vendorOrgId_status_idx" ON "trips"("vendorOrgId", "status");

-- CreateIndex
CREATE INDEX "trips_planId_idx" ON "trips"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_stops_tripId_sequence_key" ON "trip_stops"("tripId", "sequence");

-- CreateIndex
CREATE INDEX "trip_employees_employeeId_status_idx" ON "trip_employees"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trip_employees_tripId_employeeId_key" ON "trip_employees"("tripId", "employeeId");

-- CreateIndex
CREATE INDEX "trip_assignments_tripId_status_idx" ON "trip_assignments"("tripId", "status");

-- CreateIndex
CREATE INDEX "trip_assignments_driverId_status_idx" ON "trip_assignments"("driverId", "status");

-- CreateIndex
CREATE INDEX "trip_assignments_vehicleId_status_idx" ON "trip_assignments"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "trip_assignments_guardId_status_idx" ON "trip_assignments"("guardId", "status");

-- CreateIndex
CREATE INDEX "trip_events_tripId_createdAt_idx" ON "trip_events"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "safety_policies_corporateOrgId_active_idx" ON "safety_policies"("corporateOrgId", "active");

-- CreateIndex
CREATE INDEX "safety_rules_policyId_type_idx" ON "safety_rules"("policyId", "type");

-- CreateIndex
CREATE INDEX "safety_events_tripId_idx" ON "safety_events"("tripId");

-- CreateIndex
CREATE INDEX "otp_challenges_tripEmployeeId_purpose_status_idx" ON "otp_challenges"("tripEmployeeId", "purpose", "status");

-- CreateIndex
CREATE INDEX "location_events_tripId_recordedAt_idx" ON "location_events"("tripId", "recordedAt");

-- CreateIndex
CREATE INDEX "location_events_vehicleId_recordedAt_idx" ON "location_events"("vehicleId", "recordedAt");

-- CreateIndex
CREATE INDEX "geofences_corporateOrgId_type_idx" ON "geofences"("corporateOrgId", "type");

-- CreateIndex
CREATE INDEX "notifications_recipientId_status_idx" ON "notifications"("recipientId", "status");

-- CreateIndex
CREATE INDEX "notifications_tripId_idx" ON "notifications"("tripId");

-- CreateIndex
CREATE INDEX "incidents_tripId_idx" ON "incidents"("tripId");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trip_charges_tripId_key" ON "trip_charges"("tripId");

-- CreateIndex
CREATE INDEX "invoices_vendorOrgId_status_idx" ON "invoices"("vendorOrgId", "status");

-- CreateIndex
CREATE INDEX "invoices_corporateOrgId_status_idx" ON "invoices"("corporateOrgId", "status");

-- CreateIndex
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "compliance_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_corporateOrgId_fkey" FOREIGN KEY ("corporateOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_corporateOrgId_fkey" FOREIGN KEY ("corporateOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_plans" ADD CONSTRAINT "transport_plans_corporateOrgId_fkey" FOREIGN KEY ("corporateOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_plans" ADD CONSTRAINT "transport_plans_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_exceptions" ADD CONSTRAINT "plan_exceptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "transport_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_planId_fkey" FOREIGN KEY ("planId") REFERENCES "transport_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_corporateOrgId_fkey" FOREIGN KEY ("corporateOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vendorOrgId_fkey" FOREIGN KEY ("vendorOrgId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_employees" ADD CONSTRAINT "trip_employees_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_employees" ADD CONSTRAINT "trip_employees_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_employees" ADD CONSTRAINT "trip_employees_pickupStopId_fkey" FOREIGN KEY ("pickupStopId") REFERENCES "trip_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_assignments" ADD CONSTRAINT "trip_assignments_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "guards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_policies" ADD CONSTRAINT "safety_policies_corporateOrgId_fkey" FOREIGN KEY ("corporateOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_rules" ADD CONSTRAINT "safety_rules_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "safety_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_tripEmployeeId_fkey" FOREIGN KEY ("tripEmployeeId") REFERENCES "trip_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_events" ADD CONSTRAINT "location_events_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_charges" ADD CONSTRAINT "trip_charges_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
