-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "scopeFilters" JSONB,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "resultFileKey" TEXT,
    "errorMessage" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_jobs_requestedByUserId_createdAt_idx" ON "export_jobs"("requestedByUserId", "createdAt");
