-- AlterTable
ALTER TABLE "corporates" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPersonName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contractEndsAt" TIMESTAMP(3),
ADD COLUMN     "contractStartsAt" TIMESTAMP(3),
ADD COLUMN     "employeePickupChangeLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "paymentTerms" TEXT;

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_corporateOrgId_status_idx" ON "locations"("corporateOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "locations_corporateOrgId_code_key" ON "locations"("corporateOrgId", "code");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_corporateOrgId_fkey" FOREIGN KEY ("corporateOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
