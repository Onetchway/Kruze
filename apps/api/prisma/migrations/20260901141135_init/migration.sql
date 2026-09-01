-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "OrganisationRole" AS ENUM ('KRUZE_PLATFORM', 'CORPORATE', 'FLEET_OPERATOR', 'VENDOR', 'SUB_VENDOR');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('KRUZE_SUPER_ADMIN', 'TENANT_ADMIN', 'CORPORATE_TRANSPORT_ADMIN', 'CORPORATE_HR', 'CORPORATE_FINANCE', 'CORPORATE_SAFETY_COMPLIANCE', 'FLEET_OPERATOR_ADMIN', 'VENDOR_ADMIN', 'SUPERVISOR_DISPATCHER', 'DRIVER', 'GUARD', 'EMPLOYEE', 'AUDITOR');

-- CreateEnum
CREATE TYPE "OrganisationRelationshipType" AS ENUM ('KRUZE_TENANCY', 'OPERATOR_MANAGES_CORPORATE', 'CORPORATE_VENDOR', 'VENDOR_SUB_VENDOR');

-- CreateEnum
CREATE TYPE "OrganisationRelationshipStatus" AS ENUM ('INVITED', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResourceRelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('DRIVER', 'VEHICLE', 'GUARD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "globalOrgId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "roles" "OrganisationRole"[],
    "status" "OrganisationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_relationships" (
    "id" TEXT NOT NULL,
    "sourceOrgId" TEXT NOT NULL,
    "targetOrgId" TEXT NOT NULL,
    "type" "OrganisationRelationshipType" NOT NULL,
    "status" "OrganisationRelationshipStatus" NOT NULL DEFAULT 'INVITED',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporates" (
    "organisationId" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporates_pkey" PRIMARY KEY ("organisationId")
);

-- CreateTable
CREATE TABLE "vendor_profiles" (
    "organisationId" TEXT NOT NULL,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("organisationId")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "globalDriverId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenceNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_vendor_relationships" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vendorOrgId" TEXT NOT NULL,
    "status" "ResourceRelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "employmentType" TEXT,
    "operatingCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_vendor_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "globalVehicleId" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "vehicleType" TEXT,
    "capacity" INTEGER,
    "fuelType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_vendor_relationships" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vendorOrgId" TEXT NOT NULL,
    "status" "ResourceRelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "ownershipType" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_vendor_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guards" (
    "id" TEXT NOT NULL,
    "globalGuardId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guard_vendor_relationships" (
    "id" TEXT NOT NULL,
    "guardId" TEXT NOT NULL,
    "vendorOrgId" TEXT NOT NULL,
    "status" "ResourceRelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guard_vendor_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_resource_eligibilities" (
    "id" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "vendorOrgId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "organisationRelationshipId" TEXT,
    "status" "ResourceRelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_resource_eligibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "organisationId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "reason" TEXT,
    "correlationId" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_globalOrgId_key" ON "organisations"("globalOrgId");

-- CreateIndex
CREATE INDEX "organisation_memberships_organisationId_idx" ON "organisation_memberships"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_memberships_userId_organisationId_role_key" ON "organisation_memberships"("userId", "organisationId", "role");

-- CreateIndex
CREATE INDEX "organisation_relationships_sourceOrgId_status_idx" ON "organisation_relationships"("sourceOrgId", "status");

-- CreateIndex
CREATE INDEX "organisation_relationships_targetOrgId_status_idx" ON "organisation_relationships"("targetOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_globalDriverId_key" ON "drivers"("globalDriverId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_phone_key" ON "drivers"("phone");

-- CreateIndex
CREATE INDEX "driver_vendor_relationships_vendorOrgId_status_idx" ON "driver_vendor_relationships"("vendorOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_vendor_relationships_driverId_vendorOrgId_key" ON "driver_vendor_relationships"("driverId", "vendorOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_globalVehicleId_key" ON "vehicles"("globalVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registrationNo_key" ON "vehicles"("registrationNo");

-- CreateIndex
CREATE INDEX "vehicle_vendor_relationships_vendorOrgId_status_idx" ON "vehicle_vendor_relationships"("vendorOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_vendor_relationships_vehicleId_vendorOrgId_key" ON "vehicle_vendor_relationships"("vehicleId", "vendorOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "guards_globalGuardId_key" ON "guards"("globalGuardId");

-- CreateIndex
CREATE UNIQUE INDEX "guards_phone_key" ON "guards"("phone");

-- CreateIndex
CREATE INDEX "guard_vendor_relationships_vendorOrgId_status_idx" ON "guard_vendor_relationships"("vendorOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "guard_vendor_relationships_guardId_vendorOrgId_key" ON "guard_vendor_relationships"("guardId", "vendorOrgId");

-- CreateIndex
CREATE INDEX "corporate_resource_eligibilities_vendorOrgId_idx" ON "corporate_resource_eligibilities"("vendorOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_resource_eligibilities_corporateOrgId_resourceTyp_key" ON "corporate_resource_eligibilities"("corporateOrgId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_organisationId_createdAt_idx" ON "audit_logs"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "organisation_memberships" ADD CONSTRAINT "organisation_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_memberships" ADD CONSTRAINT "organisation_memberships_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_relationships" ADD CONSTRAINT "organisation_relationships_sourceOrgId_fkey" FOREIGN KEY ("sourceOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_relationships" ADD CONSTRAINT "organisation_relationships_targetOrgId_fkey" FOREIGN KEY ("targetOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_relationships" ADD CONSTRAINT "organisation_relationships_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_relationships" ADD CONSTRAINT "organisation_relationships_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporates" ADD CONSTRAINT "corporates_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vendor_relationships" ADD CONSTRAINT "driver_vendor_relationships_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vendor_relationships" ADD CONSTRAINT "driver_vendor_relationships_vendorOrgId_fkey" FOREIGN KEY ("vendorOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_vendor_relationships" ADD CONSTRAINT "vehicle_vendor_relationships_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_vendor_relationships" ADD CONSTRAINT "vehicle_vendor_relationships_vendorOrgId_fkey" FOREIGN KEY ("vendorOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guard_vendor_relationships" ADD CONSTRAINT "guard_vendor_relationships_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "guards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guard_vendor_relationships" ADD CONSTRAINT "guard_vendor_relationships_vendorOrgId_fkey" FOREIGN KEY ("vendorOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_resource_eligibilities" ADD CONSTRAINT "corporate_resource_eligibilities_corporateOrgId_fkey" FOREIGN KEY ("corporateOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
