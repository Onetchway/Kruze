"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Incident } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function severityClass(sev: string) {
  if (sev === "CRITICAL" || sev === "HIGH") return "warning";
  return "";
}

export default function SafetyPage() {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [telemetry, setTelemetry] = useState<{ overspeedCount: number; gpsOfflineCount: number; runningTrips: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listIncidents(session.accessToken).then(setIncidents).catch(() => {});
    api.liveSafetySummary(session.accessToken).then(setTelemetry).catch(() => {});
  }

  useEffect(reload, [session]);
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(reload, 15000);
    return () => clearInterval(interval);
  }, [session]);

  const openIncidents = incidents.filter((i) => i.status !== "CLOSED" && i.category !== "SOS");
  const sosCount = incidents.filter((i) => i.status !== "CLOSED" && i.category === "SOS").length;

  async function handleClose(id: string) {
    if (!session) return;
    const correctiveAction = window.prompt("Corrective action taken?");
    if (!correctiveAction) return;
    try {
      await api.closeIncident(session.accessToken, id, correctiveAction);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to close incident");
    }
  }

  return (
    <ProtectedShell title="Live Safety" subtitle="Real-time telemetry and open incidents across today's running trips.">
      <div className="stat-row">
        <div className={`stat-tile ${sosCount > 0 ? "warning" : ""}`}>
          <div className="value">{sosCount}</div>
          <div className="label">SOS active</div>
        </div>
        <div className={`stat-tile ${(telemetry?.overspeedCount ?? 0) > 0 ? "warning" : ""}`}>
          <div className="value">{telemetry?.overspeedCount ?? 0}</div>
          <div className="label">Overspeed</div>
        </div>
        <div className={`stat-tile ${(telemetry?.gpsOfflineCount ?? 0) > 0 ? "warning" : ""}`}>
          <div className="value">{telemetry?.gpsOfflineCount ?? 0}</div>
          <div className="label">GPS offline</div>
        </div>
        <div className={`stat-tile ${openIncidents.length > 0 ? "warning" : ""}`}>
          <div className="value">{openIncidents.length}</div>
          <div className="label">Other open incidents</div>
        </div>
      </div>

      {sosCount > 0 && (
        <div className="card" style={{ borderColor: "var(--warning)" }}>
          <strong>{sosCount} active SOS alert{sosCount > 1 ? "s" : ""}.</strong>{" "}
          <a href="/safety/sos">Open the SOS screen →</a>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Open incidents (non-SOS)</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Severity</th>
              <th>Description</th>
              <th>Raised</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {openIncidents.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className="badge">{i.category}</span>
                </td>
                <td className={severityClass(i.severity)}>{i.severity}</td>
                <td>{i.description ?? "—"}</td>
                <td>{new Date(i.createdAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => handleClose(i.id)}>Close</button>
                </td>
              </tr>
            ))}
            {openIncidents.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No open incidents. All clear.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {error && <p className="error-text">{error}</p>}
      </div>
    </ProtectedShell>
  );
}
