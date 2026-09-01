"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Shift } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function ShiftsPage() {
  const { session } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listShifts(session.accessToken).then(setShifts).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createShift(session.accessToken, { name, startTime, endTime });
      setName("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create shift");
    } finally {
      setBusy(false);
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
          <button type="submit" disabled={busy}>
            Add shift
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Window</th>
              <th>Pickup window (min)</th>
              <th>Cut-off (min before)</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>
                  {s.startTime}–{s.endTime}
                </td>
                <td>{s.pickupWindowMinutes}</td>
                <td>{s.cutoffMinutesBeforeStart}</td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  No shifts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
