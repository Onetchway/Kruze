-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('OFFICE', 'CAMPUS', 'PARKING', 'DEPOT');

-- CreateEnum
CREATE TYPE "PickupPointType" AS ENUM ('METRO', 'SAFE_ZONE', 'OTHER');

-- CreateEnum
CREATE TYPE "RosterPublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'LOCKED');

-- CreateEnum
CREATE TYPE "RouteAcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "eligibilityReason" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "pickupLocationId" TEXT,
ADD COLUMN     "specialRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "transportEligible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "paidAmount" DECIMAL(14,2),
ADD COLUMN     "paymentStatus" "InvoicePaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "pickupPointType" "PickupPointType",
ADD COLUMN     "type" "LocationType" NOT NULL DEFAULT 'OFFICE';

-- AlterTable
ALTER TABLE "roster_entries" ADD COLUMN     "publishStatus" "RosterPublishStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "maxRideTimeMinutes" INTEGER,
ADD COLUMN     "nightShift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "safetyPolicyId" TEXT,
ADD COLUMN     "transportRequired" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "reoptimizationRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routeAcceptanceStatus" "RouteAcceptanceStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_safetyPolicyId_fkey" FOREIGN KEY ("safetyPolicyId") REFERENCES "safety_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
