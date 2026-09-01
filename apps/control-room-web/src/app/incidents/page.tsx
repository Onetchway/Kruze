"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Incident } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function IncidentsPage() {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [correctiveDrafts, setCorrectiveDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listIncidents(session.accessToken).then(setIncidents).catch(() => {});
  }

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 10_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleClose(id: string) {
    if (!session) return;
    setError(null);
    try {
      await api.closeIncident(session.accessToken, id, correctiveDrafts[id] || "Resolved");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to close incident");
    }
  }

  const sos = incidents.filter((i) => i.category === "SOS" && i.status !== "CLOSED");
  const visible = showAll ? incidents : incidents.filter((i) => i.status !== "CLOSED");

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Incidents / SOS</h2>

      {sos.length > 0 && (
        <div className="card alert">
          <strong>{sos.length} active SOS alert{sos.length > 1 ? "s" : ""}</strong> — review below.
        </div>
      )}

      <div className="card">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
          <input type="checkbox" style={{ width: "auto" }} checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show closed incidents too
        </label>
        {error && <p className="error-text">{error}</p>}
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Reported</th>
              <th>Description</th>
              <th>Corrective action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className={i.category === "SOS" ? "badge danger" : "badge"}>{i.category}</span>
                </td>
                <td>{i.severity}</td>
                <td>
                  <span className="badge">{i.status}</span>
                </td>
                <td>{new Date(i.createdAt).toLocaleString()}</td>
                <td>{i.description ?? "—"}</td>
                <td>
                  {i.status === "CLOSED" ? (
                    i.correctiveAction ?? "—"
                  ) : (
                    <input
                      value={correctiveDrafts[i.id] ?? ""}
                      onChange={(e) => setCorrectiveDrafts((prev) => ({ ...prev, [i.id]: e.target.value }))}
                      placeholder="Resolved"
                      style={{ width: 160 }}
                    />
                  )}
                </td>
                <td>
                  {i.status !== "CLOSED" && <button onClick={() => handleClose(i.id)}>Close</button>}
                  {i.tripId && (
                    <div style={{ marginTop: 4 }}>
                      <a href={`/trips/${i.tripId}`}>View trip →</a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  {showAll ? "No incidents yet." : "No open incidents."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
