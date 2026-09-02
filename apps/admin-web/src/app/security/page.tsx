"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  actor: { displayName: string; email: string | null } | null;
  organisation: { displayName: string } | null;
  reason: string | null;
}

interface SecurityOverview {
  last7Days: { failedLoginCount: number; successfulLoginCount: number; roleChangeCount: number };
  failedLogins: AuditRow[];
  roleChanges: AuditRow[];
  suspensionEvents: AuditRow[];
  currentlySuspendedOrganisations: { id: string; globalOrgId: string; displayName: string; suspendedAt: string | null; suspendedReason: string | null }[];
  topAuditActions: { action: string; count: number }[];
  apiKeyEvents: { implemented: boolean; note: string };
}

export default function SecurityPage() {
  const { session } = useAuth();
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api
      .getSecurityOverview(session.accessToken)
      .then((d) => setData(d as unknown as SecurityOverview))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load security overview"));
  }, [session]);

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Security Center</h2>
      <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
        Derived from real audit_log rows written by the auth flow and platform-admin mutations — last 7 days.
      </p>
      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p style={{ color: "var(--text-muted)" }}>Loading…</p>}

      {data && (
        <>
          <div className="stat-row">
            <div className={`stat-tile${data.last7Days.failedLoginCount > 0 ? " warning" : ""}`}>
              <div className="value">{data.last7Days.failedLoginCount}</div>
              <div className="label">Failed logins (7d)</div>
            </div>
            <div className="stat-tile">
              <div className="value">{data.last7Days.successfulLoginCount}</div>
              <div className="label">Successful logins (7d)</div>
            </div>
            <div className="stat-tile">
              <div className="value">{data.last7Days.roleChangeCount}</div>
              <div className="label">Role changes (7d)</div>
            </div>
            <div className={`stat-tile${data.currentlySuspendedOrganisations.length > 0 ? " warning" : ""}`}>
              <div className="value">{data.currentlySuspendedOrganisations.length}</div>
              <div className="label">Suspended tenants</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Failed logins</h3>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Account</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.failedLogins.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.actor?.email ?? r.actor?.displayName ?? "unknown"}</td>
                    <td>{r.reason ?? "—"}</td>
                  </tr>
                ))}
                {data.failedLogins.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                      No failed logins in the last 7 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Role changes</h3>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Organisation</th>
                </tr>
              </thead>
              <tbody>
                {data.roleChanges.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.actor?.displayName ?? "—"}</td>
                    <td>{r.organisation?.displayName ?? "—"}</td>
                  </tr>
                ))}
                {data.roleChanges.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                      No role changes in the last 7 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Currently suspended tenants</h3>
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Since</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.currentlySuspendedOrganisations.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <a href={`/organisations/${o.id}`}>{o.displayName}</a>
                    </td>
                    <td>{o.suspendedAt ? new Date(o.suspendedAt).toLocaleString() : "—"}</td>
                    <td>{o.suspendedReason ?? "—"}</td>
                  </tr>
                ))}
                {data.currentlySuspendedOrganisations.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                      No tenants currently suspended.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Top audit actions (7d)</h3>
            <table>
              <tbody>
                {data.topAuditActions.map((a) => (
                  <tr key={a.action}>
                    <td className="mono">{a.action}</td>
                    <td>{a.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ color: "var(--text-muted)" }}>
            <strong>API key / OAuth / webhook events:</strong> {data.apiKeyEvents.note}
          </div>
        </>
      )}
    </ProtectedShell>
  );
}
