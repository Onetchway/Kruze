"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, SupportCaseCategory, SupportCasePriority, SupportCaseRow, SupportCaseStatus, SupportCaseSummary } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const STATUSES: SupportCaseStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];
const CATEGORIES: SupportCaseCategory[] = [
  "LOGIN",
  "OTP",
  "TRIP",
  "GPS",
  "INTEGRATION",
  "BILLING",
  "EMPLOYEE",
  "DRIVER",
  "COMPLIANCE",
  "PERFORMANCE",
  "SECURITY",
];
const PRIORITIES: SupportCasePriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function statusBadge(status: SupportCaseStatus) {
  if (status === "RESOLVED" || status === "CLOSED") return " success";
  if (status === "OPEN") return " warning";
  return "";
}

export default function SupportPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<SupportCaseRow[]>([]);
  const [summary, setSummary] = useState<SupportCaseSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<SupportCaseCategory>("TRIP");
  const [priority, setPriority] = useState<SupportCasePriority>("MEDIUM");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    if (!session) return;
    api
      .listSupportCases(session.accessToken, {
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined,
      })
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load support cases"));
    api.getSupportCasesSummary(session.accessToken).then(setSummary).catch(() => {});
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [session, statusFilter, categoryFilter, priorityFilter]);

  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !description.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createSupportCase(session.accessToken, { category, priority, description: description.trim() });
      setDescription("");
      setShowForm(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create case");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>Support</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
            Super Admin support-case management (spec §55). This is the management side only — there is no
            corporate/vendor/employee &quot;raise a ticket&quot; submission flow yet; cases are logged here directly
            or on a reporter&apos;s behalf, a future connection point.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Log case"}</button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {summary && (
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{summary.total}</div>
            <div className="label">Total cases</div>
          </div>
          <div className="stat-tile warning">
            <div className="value">{summary.byStatus["OPEN"] ?? 0}</div>
            <div className="label">Open</div>
          </div>
          <div className="stat-tile">
            <div className="value">{(summary.byStatus["ASSIGNED"] ?? 0) + (summary.byStatus["IN_PROGRESS"] ?? 0)}</div>
            <div className="label">In progress</div>
          </div>
          <div className="stat-tile">
            <div className="value">{summary.byPriority["URGENT"] ?? 0}</div>
            <div className="label">Urgent priority</div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <form onSubmit={createCase} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as SupportCaseCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as SupportCasePriority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Description</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div>
              <button type="submit" disabled={saving || !description.trim()}>
                Create case
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Category</th>
              <th>Priority</th>
              <th>SLA (hrs)</th>
              <th>Status</th>
              <th>Organisation</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.seq}>
                <td>
                  <a href={`/support/${c.seq}`} className="mono">
                    {c.ticketNo}
                  </a>
                </td>
                <td>{c.category}</td>
                <td>{c.priority}</td>
                <td>{c.slaTargetHours ?? "—"}</td>
                <td>
                  <span className={`badge${statusBadge(c.status)}`}>{c.status}</span>
                </td>
                <td>{c.organisation?.displayName ?? "—"}</td>
                <td>{new Date(c.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  No cases found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
