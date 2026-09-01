-- CreateTable
CREATE TABLE "event_log_entries" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_log_entries_topic_consumedAt_idx" ON "event_log_entries"("topic", "consumedAt");

-- CreateIndex
CREATE INDEX "event_log_entries_event_idx" ON "event_log_entries"("event");
