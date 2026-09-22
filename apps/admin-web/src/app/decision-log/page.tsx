"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, DecisionLogEntry } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function DecisionLogPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<DecisionLogEntry[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function reload() {
    if (!session) return;
    setLoading(true);
    api
      .listDecisionLog(session.accessToken, { q: q || undefined })
      .then((res) => setRows(res.entries))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load decision log"))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [session]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    reload();
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Automation Decision Log</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: 13 }}>
        Every driver/vehicle/guard the planning engine considered for each auto-assigned trip, why the candidates it
        rejected were rejected, and why the winner won (spec §44/§59).
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <form onSubmit={onSearch} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label>Search by trip ID or organisation</label>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="KZ-TRP-000123 or organisation name" />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button type="submit">Search</button>
          </div>
        </form>

        <table>
          <thead>
            <tr>
              <th>Trip</th>
              <th>Corporate</th>
              <th>Vendor</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Guard</th>
              <th>Rejected candidates</th>
              <th>Algorithm</th>
              <th>Decided at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <a href={`/decision-log/${r.id}`} className="mono">
                    {r.trip.globalTripId}
                  </a>
                </td>
                <td>{r.trip.corporateOrg.displayName}</td>
                <td>{r.trip.vendorOrg?.displayName ?? "—"}</td>
                <td>{r.selectedResource.driver?.label ?? r.selectedResource.driver?.id ?? "—"}</td>
                <td>{r.selectedResource.vehicle?.label ?? r.selectedResource.vehicle?.id ?? "—"}</td>
                <td>{r.selectedResource.guard ? r.selectedResource.guard.label ?? r.selectedResource.guard.id : "—"}</td>
                <td>
                  <span className={`badge${r.rejectedResources.length > 0 ? " warning" : ""}`}>{r.rejectedResources.length}</span>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {r.algorithmVersion}
                </td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: "var(--text-muted)" }}>
                  No decisions recorded yet — they appear here as soon as a corporate runs an auto-plan that
                  successfully assigns at least one trip.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
