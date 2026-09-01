"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, Organisation } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function DashboardPage() {
  const { session } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);

  useEffect(() => {
    if (!session) return;
    api.listOrganisations(session.accessToken).then(setOrganisations).catch(() => {});
  }, [session]);

  const pending = organisations.filter((o) => o.status === "PENDING_APPROVAL");
  const active = organisations.filter((o) => o.status === "ACTIVE");
  const byRole = organisations.reduce<Record<string, number>>((acc, o) => {
    for (const role of o.roles) acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Overview</h2>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{organisations.length}</div>
          <div className="label">Total organisations</div>
        </div>
        <div className="stat-tile">
          <div className="value">{active.length}</div>
          <div className="label">Active</div>
        </div>
        <div className={`stat-tile${pending.length > 0 ? " warning" : ""}`}>
          <div className="value">{pending.length}</div>
          <div className="label">Pending approval</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>By organisation type</h3>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byRole).map(([role, count]) => (
              <tr key={role}>
                <td>{role}</td>
                <td>{count}</td>
              </tr>
            ))}
            {Object.keys(byRole).length === 0 && (
              <tr>
                <td colSpan={2} style={{ color: "var(--text-muted)" }}>
                  No organisations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pending.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Pending approval</h3>
          <p style={{ color: "var(--text-muted)" }}>
            <a href="/organisations">Review on the Organisations page →</a>
          </p>
        </div>
      )}
    </ProtectedShell>
  );
}
