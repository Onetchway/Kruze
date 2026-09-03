-- CreateEnum
CREATE TYPE "NotificationTemplateCategory" AS ENUM ('EMPLOYEE', 'DRIVER', 'VENDOR', 'CORPORATE', 'GUARD', 'BILLING', 'COMPLIANCE', 'SAFETY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupportCaseCategory" AS ENUM ('LOGIN', 'OTP', 'TRIP', 'GPS', 'INTEGRATION', 'BILLING', 'EMPLOYEE', 'DRIVER', 'COMPLIANCE', 'PERFORMANCE', 'SECURITY');

-- CreateEnum
CREATE TYPE "SupportCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'ORGANISATION');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "NotificationTemplateCategory" NOT NULL,
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_cases" (
    "ticketNo" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "organisationId" TEXT,
    "reportedByUserId" TEXT,
    "category" "SupportCaseCategory" NOT NULL,
    "priority" "SupportCasePriority" NOT NULL DEFAULT 'MEDIUM',
    "slaTargetHours" INTEGER,
    "assigneeUserId" TEXT,
    "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_cases_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "support_case_events" (
    "id" TEXT NOT NULL,
    "caseId" INTEGER NOT NULL,
    "authorUserId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_case_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "FeatureFlagScope" NOT NULL DEFAULT 'GLOBAL',
    "organisationId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisationId" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT,
    "secretHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_name_key" ON "notification_templates"("name");

-- CreateIndex
CREATE INDEX "notification_templates_category_idx" ON "notification_templates"("category");

-- CreateIndex
CREATE UNIQUE INDEX "support_cases_ticketNo_key" ON "support_cases"("ticketNo");

-- CreateIndex
CREATE INDEX "support_cases_status_idx" ON "support_cases"("status");

-- CreateIndex
CREATE INDEX "support_cases_organisationId_idx" ON "support_cases"("organisationId");

-- CreateIndex
CREATE INDEX "support_cases_assigneeUserId_idx" ON "support_cases"("assigneeUserId");

-- CreateIndex
CREATE INDEX "support_case_events_caseId_createdAt_idx" ON "support_case_events"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "feature_flags_scope_idx" ON "feature_flags"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_organisationId_key" ON "feature_flags"("key", "organisationId");

-- CreateIndex
CREATE INDEX "api_keys_organisationId_idx" ON "api_keys"("organisationId");

-- CreateIndex
CREATE INDEX "api_keys_status_idx" ON "api_keys"("status");

-- AddForeignKey
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_case_events" ADD CONSTRAINT "support_case_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "support_cases"("seq") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
