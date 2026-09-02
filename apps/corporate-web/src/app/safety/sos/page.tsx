"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Incident, TripDetail } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function SosPage() {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listIncidents(session.accessToken).then((all) => setIncidents(all.filter((i) => i.category === "SOS"))).catch(() => {});
  }

  useEffect(reload, [session]);

  async function openIncident(incident: Incident) {
    setSelected(incident);
    setTrip(null);
    if (!session || !incident.tripId) return;
    try {
      const t = await api.getTrip(session.accessToken, incident.tripId);
      setTrip(t);
    } catch {
      setTrip(null);
    }
  }

  async function handleClose() {
    if (!session || !selected) return;
    const correctiveAction = window.prompt("Corrective action taken?");
    if (!correctiveAction) return;
    try {
      await api.closeIncident(session.accessToken, selected.id, correctiveAction);
      setSelected(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to close");
    }
  }

  const open = incidents.filter((i) => i.status !== "CLOSED");
  const assignment = trip?.assignments?.[0];

  return (
    <ProtectedShell title="SOS" subtitle="Every active SOS alert, with everything a responder needs in one place.">
      <div className="stat-row">
        <div className={`stat-tile ${open.length > 0 ? "warning" : ""}`}>
          <div className="value">{open.length}</div>
          <div className="label">Active SOS</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Trip</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {open.map((i) => (
              <tr key={i.id} style={{ cursor: "pointer" }} onClick={() => openIncident(i)}>
                <td>🚨</td>
                <td>{i.tripId ?? "—"}</td>
                <td>{new Date(i.createdAt).toLocaleString()}</td>
                <td>
                  <span className="badge">{i.status}</span>
                </td>
              </tr>
            ))}
            {open.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  No active SOS alerts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="card" style={{ borderColor: "var(--warning)" }}>
          <h3 style={{ marginTop: 0 }}>🚨 SOS Alert</h3>
          <table>
            <tbody>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Trip</td>
                <td>{trip ? <a href={`/trips/${trip.id}`}>{trip.globalTripId}</a> : (selected.tripId ?? "—")}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Employees</td>
                <td>{trip?.employees?.map((te) => te.employee.fullName).join(", ") || "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Vehicle</td>
                <td>{assignment?.vehicle?.registrationNo ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Driver</td>
                <td>{assignment?.driver?.fullName ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Guard</td>
                <td>{assignment?.guard?.fullName ?? "None present"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Time</td>
                <td>{new Date(selected.createdAt).toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Description</td>
                <td>{selected.description ?? "—"}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <button className="secondary" disabled title="Stub — no telephony integration configured">
              Call driver
            </button>
            <button className="secondary" disabled title="Stub — no telephony integration configured">
              Call employee
            </button>
            <button className="secondary" disabled title="Stub — no telephony integration configured">
              Contact guard
            </button>
            <button className="secondary" disabled title="Stub — no escalation integration configured">
              Escalate
            </button>
            {trip && <a href={`/live-ops`}><button className="secondary" type="button">Open map</button></a>}
            <button onClick={handleClose}>Close incident</button>
          </div>
          {error && <p className="error-text">{error}</p>}
        </div>
      )}
    </ProtectedShell>
  );
}
