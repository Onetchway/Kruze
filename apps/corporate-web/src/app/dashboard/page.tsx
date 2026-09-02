"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Employee, Shift, Trip, TransportPlan, PlanException, Organisation, CorporateAnalytics } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isToday(iso: string): boolean {
  return iso.slice(0, 10) === todayIso();
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

  const [org, setOrg] = useState<Organisation | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todaysTrips, setTodaysTrips] = useState<Trip[]>([]);
  const [openExceptionsAll, setOpenExceptionsAll] = useState<(PlanException & { plan: { planDate: string; shift: Shift } })[]>([]);
  const [safetyIncidents, setSafetyIncidents] = useState<{ sos: number }>({ sos: 0 });
  const [compliance, setCompliance] = useState<{ expiring: number }>({ expiring: 0 });
  const [corpAnalytics, setCorpAnalytics] = useState<CorporateAnalytics | null>(null);

  useEffect(() => {
    if (!session) return;
    api
      .listShifts(session.accessToken)
      .then((list) => {
        setShifts(list);
        if (list.length > 0) setShiftId((prev) => prev || list[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load shifts"));

    api.getMyOrganisation(session.accessToken).then(setOrg).catch(() => {});
    api.listEmployees(session.accessToken).then(setEmployees).catch(() => {});
    api.listTrips(session.accessToken).then((trips) => setTodaysTrips(trips.filter((t) => isToday(t.scheduledStartAt)))).catch(() => {});
    api.allExceptions(session.accessToken, "OPEN").then(setOpenExceptionsAll).catch(() => {});
    api.listIncidents(session.accessToken).then((all) =>
      setSafetyIncidents({ sos: all.filter((i) => i.category === "SOS" && i.status !== "CLOSED").length }),
    ).catch(() => {});
    api.complianceSummary(session.accessToken).then((rows) =>
      setCompliance({ expiring: rows.filter((r) => r.status === "EXPIRING").reduce((s, r) => s + r.count, 0) }),
    ).catch(() => {});
    api.corporateAnalytics(session.accessToken).then(setCorpAnalytics).catch(() => {});
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

  const runningToday = todaysTrips.filter((t) => t.status === "RUNNING" || t.status === "EN_ROUTE_TO_FIRST_PICKUP").length;
  const completedToday = todaysTrips.filter((t) => t.status === "COMPLETED").length;
  const breakdownToday = todaysTrips.filter((t) => t.status === "BREAKDOWN").length;
  const upcomingToday = todaysTrips.filter((t) => t.status === "SCHEDULED" || t.status === "RESOURCES_ASSIGNED" || t.status === "CREATED").length;

  const criticalCount = safetyIncidents.sos + breakdownToday;
  const attentionCount = compliance.expiring + openExceptionsAll.length;
  const onTimePct = corpAnalytics?.onTimePerformance != null ? (corpAnalytics.onTimePerformance * 100).toFixed(1) : null;

  return (
    <ProtectedShell
      title={`Good morning${org ? `, ${org.displayName}` : ""}`}
      subtitle="Here's where things stand right now."
    >
      {(criticalCount > 0 || attentionCount > 0 || onTimePct) && (
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {criticalCount > 0 && (
              <div>
                🔴 <strong>Critical:</strong>{" "}
                {[
                  safetyIncidents.sos > 0 ? `${safetyIncidents.sos} SOS active` : null,
                  breakdownToday > 0 ? `${breakdownToday} vehicle${breakdownToday > 1 ? "s" : ""} broken down` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
            {attentionCount > 0 && (
              <div>
                🟠 <strong>Attention:</strong>{" "}
                {[
                  compliance.expiring > 0 ? `${compliance.expiring} compliance item${compliance.expiring > 1 ? "s" : ""} expiring soon` : null,
                  openExceptionsAll.length > 0 ? `${openExceptionsAll.length} open planning exception${openExceptionsAll.length > 1 ? "s" : ""}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
            {onTimePct && criticalCount === 0 && (
              <div>
                🟢 <strong>Good:</strong> {onTimePct}% trips on-time over the last 30 days.
              </div>
            )}
          </div>
        </div>
      )}

      <h3>Today&apos;s Transport</h3>
      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{employees.filter((e) => e.status === "ACTIVE").length}</div>
          <div className="label">Employees</div>
        </div>
        <div className="stat-tile">
          <div className="value">{todaysTrips.length}</div>
          <div className="label">Trips planned</div>
        </div>
        <div className="stat-tile">
          <div className="value">{completedToday}</div>
          <div className="label">Trips completed</div>
        </div>
        <div className="stat-tile">
          <div className="value">{runningToday}</div>
          <div className="label">Trips running</div>
        </div>
        <div className="stat-tile">
          <div className="value">{upcomingToday}</div>
          <div className="label">Upcoming</div>
        </div>
      </div>

      <h3>Auto Plan</h3>
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
            <div className={`stat-tile ${(meta?.unassignedEmployees ?? 0) > 0 ? "warning" : ""}`}>
              <div className="value">{meta?.unassignedEmployees ?? 0}</div>
              <div className="label">Unassigned employees</div>
            </div>
            <div className={`stat-tile ${openExceptions.length > 0 ? "warning" : ""}`}>
              <div className="value">{openExceptions.length}</div>
              <div className="label">Unresolved exceptions</div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-tile">
              <div className="value">{meta?.vehiclesRequired ?? "—"}</div>
              <div className="label">Vehicles required</div>
            </div>
            <div className="stat-tile">
              <div className="value">{meta?.driversRequired ?? "—"}</div>
              <div className="label">Drivers required</div>
            </div>
            <div className="stat-tile">
              <div className="value">{meta?.guardsRequired ?? "—"}</div>
              <div className="label">Guards required</div>
            </div>
            <div className="stat-tile">
              <div className="value">{meta?.exceptionsRaised ?? 0}</div>
              <div className="label">Planning exceptions raised</div>
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
