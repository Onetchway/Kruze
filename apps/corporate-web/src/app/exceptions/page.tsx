"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, PlanException, Shift } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

type ExceptionRow = PlanException & { plan: { planDate: string; shift: Shift } };

const SEVERITY_BY_TYPE: Record<string, string> = {
  SAFETY_RULE_IMPOSSIBLE: "🔴",
  NO_GUARD_AVAILABLE: "🟠",
  NO_ELIGIBLE_VEHICLE: "🟠",
};

export default function ExceptionsPage() {
  const { session } = useAuth();
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("OPEN");

  function reload() {
    if (!session) return;
    api.allExceptions(session.accessToken, statusFilter === "ALL" ? undefined : statusFilter).then(setExceptions).catch(() => {});
  }

  useEffect(reload, [session, statusFilter]);

  return (
    <ProtectedShell
      title="Exceptions"
      subtitle="Everything that needs a human — the system handles normal operations automatically."
    >
      <div className="stat-row">
        <div className={`stat-tile ${exceptions.length > 0 ? "warning" : ""}`}>
          <div className="value">{exceptions.length}</div>
          <div className="label">{statusFilter === "ALL" ? "Total exceptions" : `${statusFilter} exceptions`}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["OPEN", "RESOLVED", "ALL"].map((s) => (
            <button key={s} className={statusFilter === s ? "" : "secondary"} onClick={() => setStatusFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Type</th>
              <th>Shift / Date</th>
              <th>Status</th>
              <th>Raised</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((e) => (
              <tr key={e.id}>
                <td>{SEVERITY_BY_TYPE[e.type] ?? "🟡"}</td>
                <td>{e.type.replaceAll("_", " ")}</td>
                <td>
                  {e.plan?.shift?.name} — {e.plan?.planDate?.slice(0, 10)}
                </td>
                <td>
                  <span className="badge">{e.status}</span>
                </td>
                <td>{new Date(e.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {exceptions.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  Nothing here — every plan is running clean.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
