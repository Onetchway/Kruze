-- CreateTable
CREATE TABLE "planning_decision_logs" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "corporateOrgId" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "candidateResources" JSONB NOT NULL,
    "rejectedResources" JSONB NOT NULL,
    "selectedResource" JSONB NOT NULL,
    "constraintsEvaluated" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planning_decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planning_decision_logs_tripId_key" ON "planning_decision_logs"("tripId");

-- CreateIndex
CREATE INDEX "planning_decision_logs_corporateOrgId_createdAt_idx" ON "planning_decision_logs"("corporateOrgId", "createdAt");

-- AddForeignKey
ALTER TABLE "planning_decision_logs" ADD CONSTRAINT "planning_decision_logs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
