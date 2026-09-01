-- DropIndex
DROP INDEX "rate_cards_contractId_vehicleType_effectiveFrom_idx";

-- AlterTable
ALTER TABLE "rate_cards" ADD COLUMN     "zoneId" TEXT;

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_payment_vouchers" (
    "id" TEXT NOT NULL,
    "vendorOrgId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "chequeNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_payment_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zones_corporateOrgId_status_idx" ON "zones"("corporateOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "zones_corporateOrgId_code_key" ON "zones"("corporateOrgId", "code");

-- CreateIndex
CREATE INDEX "driver_payment_vouchers_vendorOrgId_status_idx" ON "driver_payment_vouchers"("vendorOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_payment_vouchers_vendorOrgId_driverId_periodStart_pe_key" ON "driver_payment_vouchers"("vendorOrgId", "driverId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "rate_cards_contractId_vehicleType_zoneId_effectiveFrom_idx" ON "rate_cards"("contractId", "vehicleType", "zoneId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_corporateOrgId_fkey" FOREIGN KEY ("corporateOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_payment_vouchers" ADD CONSTRAINT "driver_payment_vouchers_vendorOrgId_fkey" FOREIGN KEY ("vendorOrgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_payment_vouchers" ADD CONSTRAINT "driver_payment_vouchers_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
