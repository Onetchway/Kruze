"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Shift, Employee, RosterEntry } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Every date from `from` to `to` inclusive, optionally skipping weekends. */
function dateRange(from: string, to: string, weekdaysOnly: boolean): string[] {
  const dates: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 366) {
    const day = new Date(cursor).getUTCDay();
    if (!weekdaysOnly || (day !== 0 && day !== 6)) {
      dates.push(cursor);
    }
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

export default function RostersPage() {
  const { session } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<RosterEntry[]>([]);

  const [shiftId, setShiftId] = useState("");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ total: number; succeeded: number } | null>(null);

  useEffect(() => {
    if (!session) return;
    api.listShifts(session.accessToken).then((list) => {
      setShifts(list);
      setShiftId((prev) => prev || list[0]?.id || "");
    }).catch(() => {});
    api.listEmployees(session.accessToken).then(setEmployees).catch(() => {});
  }, [session]);

  function reloadEntries() {
    if (!session) return;
    api
      .listRosterEntries(session.accessToken, { shiftId: shiftId || undefined, from, to })
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load roster"));
  }

  useEffect(reloadEntries, [session, shiftId, from, to]);

  const activeEmployees = useMemo(() => employees.filter((e) => e.status === "ACTIVE"), [employees]);

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedEmployeeIds(new Set(activeEmployees.map((e) => e.id)));
  }

  function selectNone() {
    setSelectedEmployeeIds(new Set());
  }

  async function handleCreateRoster() {
    if (!session || !shiftId || selectedEmployeeIds.size === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const dates = dateRange(from, to, weekdaysOnly);
      if (dates.length === 0) throw new Error("Date range is empty");
      await api.bulkUpsertRoster(session.accessToken, {
        shiftId,
        employeeIds: Array.from(selectedEmployeeIds),
        dates,
      });
      setMessage(`Rostered ${selectedEmployeeIds.size} employee(s) across ${dates.length} date(s).`);
      reloadEntries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to create roster");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(id: string) {
    if (!session) return;
    try {
      await api.cancelRosterEntry(session.accessToken, id);
      reloadEntries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel entry");
    }
  }

  const optedIn = entries.filter((e) => e.status === "OPTED_IN");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;
    setBusy(true);
    setError(null);
    setUploadResult(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const [header, ...dataLines] = lines;
      const columns = header.split(",").map((c) => c.trim().toLowerCase());
      const codeIdx = columns.indexOf("employeecode");
      const shiftIdx = columns.indexOf("shiftid");
      const dateIdx = columns.indexOf("date");
      if (codeIdx === -1 || shiftIdx === -1 || dateIdx === -1) {
        throw new Error("CSV must have headers: employeeCode,shiftId,date");
      }
      const rows = dataLines.map((line) => {
        const cells = line.split(",").map((c) => c.trim());
        return { employeeCode: cells[codeIdx], shiftId: cells[shiftIdx], date: cells[dateIdx] };
      });
      const result = await api.bulkUploadRoster(session.accessToken, rows);
      setUploadResult({ total: result.total, succeeded: result.succeeded });
      reloadEntries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to upload roster file");
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoGenerate() {
    if (!session) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.autoGenerateRoster(session.accessToken, { from, to, weekdaysOnly });
      setMessage(`Auto-generated ${result.created} roster entr${result.created === 1 ? "y" : "ies"} from employees' default shifts.`);
      reloadEntries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Auto-generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishStatus(publishStatus: "PUBLISHED" | "LOCKED") {
    if (!session || !shiftId) return;
    setBusy(true);
    setError(null);
    try {
      await api.setRosterPublishStatus(session.accessToken, { shiftId, date: from, publishStatus });
      setMessage(`Roster for the selected shift on ${from} is now ${publishStatus}.`);
      reloadEntries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update publish status");
    } finally {
      setBusy(false);
    }
  }

  const anyLocked = entries.some((e) => e.publishStatus === "LOCKED");

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Rosters</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Roster employees onto a shift for a date range in one go — the auto-plan engine picks up everyone
        opted in on a given date when you generate that day&apos;s plan.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create / update roster</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
            <label>Shift</label>
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              {shifts.length === 0 && <option value="">No shifts yet</option>}
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime}–{s.endTime})
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>
              <input
                type="checkbox"
                checked={weekdaysOnly}
                onChange={(e) => setWeekdaysOnly(e.target.checked)}
                style={{ width: "auto", marginRight: 6, verticalAlign: "middle" }}
              />
              Weekdays only
            </label>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Employees ({selectedEmployeeIds.size} of {activeEmployees.length} selected)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="secondary" type="button" onClick={selectAll}>
                Select all
              </button>
              <button className="secondary" type="button" onClick={selectNone}>
                Clear
              </button>
            </div>
          </div>
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 8,
            }}
          >
            {activeEmployees.length === 0 && (
              <p style={{ color: "var(--text-muted)", margin: 4 }}>No active employees yet.</p>
            )}
            {activeEmployees.map((emp) => (
              <label key={emp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}>
                <input
                  type="checkbox"
                  checked={selectedEmployeeIds.has(emp.id)}
                  onChange={() => toggleEmployee(emp.id)}
                  style={{ width: "auto" }}
                />
                <span>
                  {emp.fullName} <span style={{ color: "var(--text-muted)" }}>({emp.employeeCode})</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={handleCreateRoster} disabled={busy || !shiftId || selectedEmployeeIds.size === 0 || anyLocked}>
            {busy ? "Working..." : "Create roster"}
          </button>
          {anyLocked && <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>Roster is locked for this range.</span>}
        </div>
        {error && <p className="error-text">{error}</p>}
        {message && <p style={{ color: "var(--success)", fontSize: 13, marginTop: 8 }}>{message}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Bulk import & auto-generate</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label className="secondary" style={{ display: "inline-block", padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--border)" }}>
              Upload CSV (employeeCode,shiftId,date)
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>
          <button className="secondary" type="button" onClick={handleAutoGenerate} disabled={busy}>
            Auto-generate from employees&apos; default shifts
          </button>
          <button className="secondary" type="button" disabled title="Stub — no HRMS integration configured">
            Import from HRMS
          </button>
        </div>
        {uploadResult && (
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Uploaded {uploadResult.total} row(s), {uploadResult.succeeded} succeeded.
          </p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Publish / lock ({shifts.find((s) => s.id === shiftId)?.name ?? "—"} · {from})</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Publishing signals to the auto-plan engine that this shift/date roster is final; locking makes it
          read-only — no further opt-in/opt-out/cancel changes until unlocked.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => handlePublishStatus("PUBLISHED")} disabled={busy || !shiftId}>
            Publish
          </button>
          <button className="secondary" onClick={() => handlePublishStatus("LOCKED")} disabled={busy || !shiftId}>
            Lock
          </button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{optedIn.length}</div>
          <div className="label">Opted-in entries in range</div>
        </div>
        <div className="stat-tile">
          <div className="value">{new Set(optedIn.map((e) => e.date)).size}</div>
          <div className="label">Dates covered</div>
        </div>
        <div className="stat-tile">
          <div className="value">{new Set(optedIn.map((e) => e.employeeId)).size}</div>
          <div className="label">Employees rostered</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          Roster entries ({from} → {to}) {anyLocked && <span className="badge">Some entries locked</span>}
        </h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Shift</th>
              <th>Date</th>
              <th>Status</th>
              <th>Publish status</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.employee?.fullName ?? e.employeeId}</td>
                <td>{e.shift?.name ?? e.shiftId}</td>
                <td>{e.date.slice(0, 10)}</td>
                <td>
                  <span className="badge">{e.status}</span>
                </td>
                <td>
                  <span className={`badge ${e.publishStatus === "LOCKED" ? "warning" : ""}`}>{e.publishStatus ?? "DRAFT"}</span>
                </td>
                <td>{e.source}</td>
                <td>
                  {e.status === "OPTED_IN" && e.publishStatus !== "LOCKED" && (
                    <button className="secondary" onClick={() => handleCancel(e.id)}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No roster entries in this range yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
