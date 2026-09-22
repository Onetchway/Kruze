"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError, DecisionLogEntry, DecisionLogSelectedSlot } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function SlotLine({ kind, slot }: { kind: string; slot: DecisionLogSelectedSlot | null | undefined }) {
  if (!slot) return null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "6px 0" }}>
      <span className="badge success">{kind} selected</span>
      <span className="mono">{slot.label ?? slot.id}</span>
      <span style={{ color: "var(--text-muted)" }}>— {slot.reason}</span>
    </div>
  );
}

export default function DecisionLogDetailPage() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const [entry, setEntry] = useState<DecisionLogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !params.id) return;
    api
      .getDecisionLogEntry(session.accessToken, params.id)
      .then(setEntry)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load decision"));
  }, [session, params.id]);

  if (error) {
    return (
      <ProtectedShell>
        <p className="error-text">{error}</p>
      </ProtectedShell>
    );
  }
  if (!entry) {
    return (
      <ProtectedShell>
        <p style={{ color: "var(--text-muted)" }}>Loading decision…</p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <p style={{ marginTop: 0 }}>
        <a href="/decision-log">← Automation Decision Log</a>
      </p>
      <h2 style={{ marginTop: 0, marginBottom: 4 }} className="mono">
        {entry.trip.globalTripId}
      </h2>
      <p style={{ color: "var(--text-muted)", margin: 0 }}>
        {entry.trip.corporateOrg.displayName}
        {entry.trip.vendorOrg ? ` · ${entry.trip.vendorOrg.displayName}` : ""} · scheduled{" "}
        {new Date(entry.trip.scheduledStartAt).toLocaleString()} · status {entry.trip.status}
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Outcome</h3>
        <SlotLine kind="Driver" slot={entry.selectedResource.driver} />
        <SlotLine kind="Vehicle" slot={entry.selectedResource.vehicle} />
        <SlotLine kind="Guard" slot={entry.selectedResource.guard} />
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          Algorithm: <span className="mono">{entry.algorithmVersion}</span> · Decided{" "}
          {new Date(entry.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Rejected candidates</h3>
        {entry.rejectedResources.length === 0 && <p style={{ color: "var(--text-muted)" }}>No candidates were rejected — the first eligible resource of each type was picked.</p>}
        {entry.rejectedResources.map((r, i) => (
          <div key={`${r.type}-${r.id}-${i}`} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "6px 0", borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
            <span className="badge warning">{r.type} rejected</span>
            <span className="mono">{r.label}</span>
            <span style={{ color: "var(--text-muted)" }}>— {r.reason}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Constraints evaluated</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {entry.constraintsEvaluated.map((c) => (
            <span key={c} className="badge">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>All candidates considered</h3>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>ID</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {entry.candidateResources.map((c, i) => (
              <tr key={`${c.type}-${c.id}-${i}`}>
                <td>{c.type}</td>
                <td className="mono">{c.id}</td>
                <td>{c.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
