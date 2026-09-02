"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GuardEscortPage() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<{ required: number; assigned: number; exceptions: number } | null>(null);
  const [date, setDate] = useState(todayIso());

  useEffect(() => {
    if (!session) return;
    api.guardEscortSummary(session.accessToken, date).then(setSummary).catch(() => setSummary(null));
  }, [session, date]);

  return (
    <ProtectedShell title="Guard / Escort" subtitle="Today's guard coverage, and why a guard might be missing.">
      <div style={{ marginBottom: 16 }}>
        <div className="field" style={{ maxWidth: 200 }}>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{summary?.required ?? "—"}</div>
          <div className="label">Required</div>
        </div>
        <div className="stat-tile">
          <div className="value">{summary?.assigned ?? "—"}</div>
          <div className="label">Assigned</div>
        </div>
        <div className={`stat-tile ${(summary?.exceptions ?? 0) > 0 ? "warning" : ""}`}>
          <div className="value">{summary?.exceptions ?? 0}</div>
          <div className="label">Exceptions (no guard available)</div>
        </div>
      </div>

      <div className="card">
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          A guard is required whenever a trip trips the Female Safety policy&apos;s mandatory-guard rule (see Safety →
          Female Safety). Exceptions are trips where the auto-plan needed a guard but none was available from a
          connected vendor — check{" "}
          <a href="/exceptions">Exceptions</a> for the affected trips.
        </p>
      </div>
    </ProtectedShell>
  );
}
