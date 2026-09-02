"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Incident, TripDetail, EscalationStep } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const DEFAULT_ESCALATION_CHAIN: EscalationStep[] = [
  { role: "Guard" },
  { role: "Transport Admin" },
  { role: "SOS / Emergency Services" },
];

export default function SosPage() {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [chain, setChain] = useState<EscalationStep[]>(DEFAULT_ESCALATION_CHAIN);
  const [editingChain, setEditingChain] = useState(false);
  const [draftChain, setDraftChain] = useState<EscalationStep[]>(DEFAULT_ESCALATION_CHAIN);
  const [chainBusy, setChainBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listIncidents(session.accessToken).then((all) => setIncidents(all.filter((i) => i.category === "SOS"))).catch(() => {});
  }

  function reloadChain() {
    if (!session) return;
    api.getCorporateSettings(session.accessToken).then((s) => {
      const configured = s.config?.escalationChain;
      if (configured && configured.length > 0) {
        setChain(configured);
        setDraftChain(configured);
      }
    }).catch(() => {});
  }

  useEffect(reload, [session]);
  useEffect(reloadChain, [session]);

  function addStep() {
    setDraftChain((prev) => [...prev, { role: "", contact: "" }]);
  }
  function removeStep(index: number) {
    setDraftChain((prev) => prev.filter((_, i) => i !== index));
  }
  function moveStep(index: number, direction: -1 | 1) {
    setDraftChain((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function updateStep(index: number, field: "role" | "contact", value: string) {
    setDraftChain((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  async function saveChain() {
    if (!session) return;
    setChainBusy(true);
    setError(null);
    try {
      await api.updateCorporateSettings(session.accessToken, { config: { escalationChain: draftChain } });
      setChain(draftChain);
      setEditingChain(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save escalation chain");
    } finally {
      setChainBusy(false);
    }
  }

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ marginTop: 0 }}>Escalation chain</h3>
          {!editingChain && (
            <button
              className="secondary"
              onClick={() => {
                setDraftChain(chain);
                setEditingChain(true);
              }}
            >
              Edit
            </button>
          )}
        </div>
        {!editingChain ? (
          <p style={{ margin: 0 }}>{chain.map((s) => s.role).join(" → ")}</p>
        ) : (
          <div>
            {draftChain.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "var(--text-muted)", width: 20 }}>{i + 1}.</span>
                <input value={step.role} onChange={(e) => updateStep(i, "role", e.target.value)} placeholder="Role (e.g. Guard)" style={{ maxWidth: 200 }} />
                <input value={step.contact ?? ""} onChange={(e) => updateStep(i, "contact", e.target.value)} placeholder="Contact (optional)" style={{ maxWidth: 200 }} />
                <button className="secondary" type="button" onClick={() => moveStep(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button className="secondary" type="button" onClick={() => moveStep(i, 1)} disabled={i === draftChain.length - 1}>
                  ↓
                </button>
                <button className="secondary" type="button" onClick={() => removeStep(i)}>
                  Remove
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="secondary" type="button" onClick={addStep}>
                Add step
              </button>
              <button type="button" onClick={saveChain} disabled={chainBusy || draftChain.length === 0}>
                {chainBusy ? "Saving..." : "Save chain"}
              </button>
              <button className="secondary" type="button" onClick={() => setEditingChain(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
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
