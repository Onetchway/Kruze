"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Shift, TransportPlan, PlanException } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { session } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [planDate, setPlanDate] = useState(todayIso());
  const [plan, setPlan] = useState<TransportPlan | null>(null);
  const [exceptions, setExceptions] = useState<PlanException[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api
      .listShifts(session.accessToken)
      .then((list) => {
        setShifts(list);
        if (list.length > 0) setShiftId((prev) => prev || list[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load shifts"));
  }, [session]);

  async function handleGenerate() {
    if (!session || !shiftId) return;
    setBusy(true);
    setError(null);
    try {
      const generated = await api.generatePlan(session.accessToken, { shiftId, planDate });
      setPlan(generated);
      const exc = await api.planExceptions(session.accessToken, generated.id);
      setExceptions(exc);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Plan generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!session || !plan) return;
    setBusy(true);
    setError(null);
    try {
      const published = await api.publishPlan(session.accessToken, plan.id);
      setPlan(published);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  const openExceptions = exceptions.filter((e) => e.status === "OPEN");
  const meta = plan?.metadata;

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Auto Plan</h2>
      <p style={{ color: "var(--text-muted)" }}>
        The system plans automatically; you manage exceptions. Pick a shift and date, then generate today&apos;s plan.
      </p>

      <div className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
            <label>Shift</label>
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              {shifts.length === 0 && <option value="">No shifts yet — create one first</option>}
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime}–{s.endTime})
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
          </div>
          <button onClick={handleGenerate} disabled={busy || !shiftId}>
            {busy ? "Working..." : "Generate Plan"}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>

      {plan && (
        <>
          <div className="stat-row">
            <div className="stat-tile">
              <div className="value">{meta?.employeesRequiringTransport ?? "—"}</div>
              <div className="label">Employees requiring transport</div>
            </div>
            <div className="stat-tile">
              <div className="value">{meta?.tripsGenerated ?? "—"}</div>
              <div className="label">Trips generated</div>
            </div>
            <div className={`stat-tile ${openExceptions.length > 0 ? "warning" : ""}`}>
              <div className="value">{openExceptions.length}</div>
              <div className="label">Unresolved exceptions</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Plan v{plan.version}</strong> <span className="badge">{plan.status}</span>
              </div>
              <button onClick={handlePublish} disabled={busy || openExceptions.length > 0}>
                {openExceptions.length > 0 ? `Review ${openExceptions.length} Exception(s)` : "Publish Plan"}
              </button>
            </div>

            {exceptions.length > 0 && (
              <table style={{ marginTop: 16 }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Raised</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((e) => (
                    <tr key={e.id}>
                      <td>{e.type.replaceAll("_", " ")}</td>
                      <td>
                        <span className="badge">{e.status}</span>
                      </td>
                      <td>{new Date(e.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </ProtectedShell>
  );
}
