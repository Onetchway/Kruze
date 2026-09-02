"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Employee, Shift } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (["ACTIVE", "APPROVED", "COMPLETED", "ONLINE"].some((k) => s.includes(k))) return "badge success";
  if (["PENDING", "SCHEDULED", "TRIAL"].some((k) => s.includes(k))) return "badge warning";
  if (["SUSPENDED", "CANCELLED", "REJECTED", "FAILED", "INACTIVE", "OFFLINE"].some((k) => s.includes(k))) return "badge danger";
  return "badge neutral";
}

export default function EmployeesPage() {
  const { session } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rosterStatus, setRosterStatus] = useState<Record<string, string>>({});

  function reload() {
    if (!session) return;
    api.listEmployees(session.accessToken).then(setEmployees).catch(() => {});
    api.listShifts(session.accessToken).then((list) => {
      setShifts(list);
      if (list.length > 0) setShiftId((prev) => prev || list[0].id);
    }).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createEmployee(session.accessToken, { employeeCode, fullName, phone, shiftId: shiftId || undefined });
      setEmployeeCode("");
      setFullName("");
      setPhone("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create employee");
    } finally {
      setBusy(false);
    }
  }

  async function optInToday(employeeId: string) {
    if (!session || !shiftId) return;
    try {
      await api.upsertRosterEntry(session.accessToken, {
        employeeId,
        shiftId,
        date: todayIso(),
        status: "OPTED_IN",
      });
      setRosterStatus((prev) => ({ ...prev, [employeeId]: "Opted in for today" }));
    } catch (err) {
      setRosterStatus((prev) => ({ ...prev, [employeeId]: err instanceof ApiError ? err.message : "Failed" }));
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Employees</h2>

      <div className="card">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Employee code</label>
            <input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required placeholder="E1001" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+91..." />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Default shift</label>
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              <option value="">None</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy}>
            Add employee
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          &ldquo;Opt in for today&rdquo; creates a roster entry against the shift selected above — the demand the auto-plan
          reads on the Dashboard.
        </p>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Shift</th>
              <th>Location</th>
              <th>Pickup</th>
              <th>Vendor</th>
              <th>Current trip</th>
              <th>Phone</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>{e.employeeCode}</td>
                <td>
                  <a href={`/employees/${e.id}`}>{e.fullName}</a>
                </td>
                <td>{e.department ?? "—"}</td>
                <td>{e.shift?.name ?? "—"}</td>
                <td>{e.pickupLocation?.name ?? e.officeLabel ?? "—"}</td>
                <td>{e.currentTrip?.pickupEta ? new Date(e.currentTrip.pickupEta).toLocaleTimeString() : "—"}</td>
                <td>{e.currentTrip?.vendorOrg?.displayName ?? "—"}</td>
                <td>
                  {e.currentTrip ? (
                    <a href={`/trips/${e.currentTrip.id}`}>
                      <span className={statusBadgeClass(e.currentTrip.status)}>{e.currentTrip.status.replaceAll("_", " ")}</span>
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{e.phone}</td>
                <td>
                  <span className={statusBadgeClass(e.status)}>{e.status}</span>
                </td>
                <td>
                  <button className="secondary" onClick={() => optInToday(e.id)} disabled={!shiftId}>
                    Opt in for today
                  </button>
                  {rosterStatus[e.id] && <div style={{ fontSize: 12, marginTop: 4 }}>{rosterStatus[e.id]}</div>}
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={11} className="table-empty">
                  No employees yet.
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
