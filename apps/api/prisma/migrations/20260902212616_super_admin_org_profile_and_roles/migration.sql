-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlatformRole" ADD VALUE 'PLATFORM_OWNER';
ALTER TYPE "PlatformRole" ADD VALUE 'PLATFORM_OPERATIONS_ADMIN';
ALTER TYPE "PlatformRole" ADD VALUE 'SUPPORT_ADMIN';
ALTER TYPE "PlatformRole" ADD VALUE 'BILLING_ADMIN';
ALTER TYPE "PlatformRole" ADD VALUE 'SECURITY_ADMIN';
ALTER TYPE "PlatformRole" ADD VALUE 'COMPLIANCE_ADMIN';
ALTER TYPE "PlatformRole" ADD VALUE 'READ_ONLY_SUPER_ADMIN';

-- AlterTable
ALTER TABLE "organisations" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "brandConfig" JSONB,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "fleetSize" INTEGER,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "primaryContactEmail" TEXT,
ADD COLUMN     "primaryContactName" TEXT,
ADD COLUMN     "primaryContactPhone" TEXT,
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedByUserId" TEXT,
ADD COLUMN     "suspendedReason" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
