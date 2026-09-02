"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Shift, SafetyPolicy } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function ShiftsPage() {
  const { session } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [policies, setPolicies] = useState<SafetyPolicy[]>([]);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [maxRideTimeMinutes, setMaxRideTimeMinutes] = useState("");
  const [transportRequired, setTransportRequired] = useState(true);
  const [nightShift, setNightShift] = useState(false);
  const [safetyPolicyId, setSafetyPolicyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ maxRideTimeMinutes: string; transportRequired: boolean; nightShift: boolean; safetyPolicyId: string }>({
    maxRideTimeMinutes: "",
    transportRequired: true,
    nightShift: false,
    safetyPolicyId: "",
  });

  function reload() {
    if (!session) return;
    api.listShifts(session.accessToken).then(setShifts).catch(() => {});
    api.listSafetyPolicies(session.accessToken).then(setPolicies).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createShift(session.accessToken, {
        name,
        startTime,
        endTime,
        maxRideTimeMinutes: maxRideTimeMinutes ? Number(maxRideTimeMinutes) : undefined,
        transportRequired,
        nightShift,
        safetyPolicyId: safetyPolicyId || undefined,
      });
      setName("");
      setMaxRideTimeMinutes("");
      setSafetyPolicyId("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create shift");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(s: Shift) {
    setEditingId(s.id);
    setEditForm({
      maxRideTimeMinutes: s.maxRideTimeMinutes != null ? String(s.maxRideTimeMinutes) : "",
      transportRequired: s.transportRequired ?? true,
      nightShift: s.nightShift ?? false,
      safetyPolicyId: s.safetyPolicyId ?? "",
    });
  }

  async function handleSaveEdit(id: string) {
    if (!session) return;
    try {
      await api.updateShift(session.accessToken, id, {
        maxRideTimeMinutes: editForm.maxRideTimeMinutes ? Number(editForm.maxRideTimeMinutes) : undefined,
        transportRequired: editForm.transportRequired,
        nightShift: editForm.nightShift,
        safetyPolicyId: editForm.safetyPolicyId || undefined,
      });
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update shift");
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Shifts</h2>

      <div className="card">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Morning" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Start</label>
            <input value={startTime} onChange={(e) => setStartTime(e.target.value)} required placeholder="09:00" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>End</label>
            <input value={endTime} onChange={(e) => setEndTime(e.target.value)} required placeholder="18:00" />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Max ride time (min)</label>
            <input
              type="number"
              value={maxRideTimeMinutes}
              onChange={(e) => setMaxRideTimeMinutes(e.target.value)}
              placeholder="Corporate default"
            />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
            <label>Safety policy</label>
            <select value={safetyPolicyId} onChange={(e) => setSafetyPolicyId(e.target.value)}>
              <option value="">None</option>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>
              <input type="checkbox" checked={transportRequired} onChange={(e) => setTransportRequired(e.target.checked)} style={{ width: "auto", marginRight: 6 }} />
              Transport required
            </label>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>
              <input type="checkbox" checked={nightShift} onChange={(e) => setNightShift(e.target.checked)} style={{ width: "auto", marginRight: 6 }} />
              Night shift
            </label>
          </div>
          <button type="submit" disabled={busy}>
            Add shift
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Window</th>
              <th>Pickup window (min)</th>
              <th>Cut-off (min before)</th>
              <th>Max ride time (min)</th>
              <th>Transport required</th>
              <th>Night shift</th>
              <th>Safety policy</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) =>
              editingId === s.id ? (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    {s.startTime}–{s.endTime}
                  </td>
                  <td>{s.pickupWindowMinutes}</td>
                  <td>{s.cutoffMinutesBeforeStart}</td>
                  <td>
                    <input
                      type="number"
                      value={editForm.maxRideTimeMinutes}
                      onChange={(e) => setEditForm({ ...editForm, maxRideTimeMinutes: e.target.value })}
                      style={{ width: 90 }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={editForm.transportRequired}
                      onChange={(e) => setEditForm({ ...editForm, transportRequired: e.target.checked })}
                      style={{ width: "auto" }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={editForm.nightShift}
                      onChange={(e) => setEditForm({ ...editForm, nightShift: e.target.checked })}
                      style={{ width: "auto" }}
                    />
                  </td>
                  <td>
                    <select value={editForm.safetyPolicyId} onChange={(e) => setEditForm({ ...editForm, safetyPolicyId: e.target.value })}>
                      <option value="">None</option>
                      {policies.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleSaveEdit(s.id)}>Save</button>
                    <button className="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    {s.startTime}–{s.endTime}
                  </td>
                  <td>{s.pickupWindowMinutes}</td>
                  <td>{s.cutoffMinutesBeforeStart}</td>
                  <td>{s.maxRideTimeMinutes ?? "Corporate default"}</td>
                  <td>{s.transportRequired === false ? "No" : "Yes"}</td>
                  <td>{s.nightShift ? "Yes" : "No"}</td>
                  <td>{s.safetyPolicy?.name ?? "—"}</td>
                  <td>
                    <button className="secondary" onClick={() => startEdit(s)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ),
            )}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: "var(--text-muted)" }}>
                  No shifts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </ProtectedShell>
  );
}
