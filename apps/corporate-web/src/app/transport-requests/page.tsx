"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, RosterEntry } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

type Request = RosterEntry & { requestStatus: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_FILTERS = ["ALL", "NEW", "APPROVED", "ASSIGNED", "COMPLETED", "CANCELLED"];

export default function TransportRequestsPage() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [filter, setFilter] = useState("ALL");

  function reload() {
    if (!session) return;
    api.listTransportRequests(session.accessToken, { from, to }).then(setRequests).catch(() => {});
  }

  useEffect(reload, [session, from, to]);

  const visible = filter === "ALL" ? requests : requests.filter((r) => r.requestStatus === filter);
  const counts = STATUS_FILTERS.slice(1).map((s) => ({ status: s, count: requests.filter((r) => r.requestStatus === s).length }));

  return (
    <ProtectedShell
      title="Transport Requests"
      subtitle="Every roster opt-in, and where it stands — from newly requested through to a completed trip."
    >
      <div className="stat-row">
        {counts.map((c) => (
          <div key={c.status} className="stat-tile">
            <div className="value">{c.count}</div>
            <div className="label">{c.status}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s} className={filter === s ? "" : "secondary"} onClick={() => setFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Shift</th>
              <th>Date</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td>
                  <a href={`/employees/${r.employeeId}`}>{r.employee?.fullName ?? r.employeeId}</a>
                </td>
                <td>{r.shift?.name ?? r.shiftId}</td>
                <td>{r.date.slice(0, 10)}</td>
                <td>{r.source}</td>
                <td>
                  <span className="badge">{r.requestStatus}</span>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No requests in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
