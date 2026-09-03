"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, PlatformComplianceOverview, PlatformSafetyPolicyRow } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function CompliancePage() {
  const { session } = useAuth();
  const [overview, setOverview] = useState<PlatformComplianceOverview | null>(null);
  const [policies, setPolicies] = useState<PlatformSafetyPolicyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api.getComplianceOverview(session.accessToken).then(setOverview).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
    api.listSafetyPolicies(session.accessToken).then(setPolicies).catch(() => {});
  }, [session]);

  const d = overview?.documents;

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Safety & Compliance</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Platform-wide document compliance status across all drivers/vehicles/guards, and every corporate&apos;s Safety
        Policy — the compliance engine and policy schema are unchanged, this is a cross-tenant read view over them.
      </p>

      {error && <p className="error-text">{error}</p>}

      {d && (
        <div className="kpi-group">
          <h3>Document status (platform-wide)</h3>
          <div className="stat-row">
            <div className="stat-tile success">
              <div className="value">{d.valid}</div>
              <div className="label">Valid</div>
            </div>
            <div className={`stat-tile${d.expiringSoon > 0 ? " warning" : ""}`}>
              <div className="value">{d.expiringSoon}</div>
              <div className="label">Expiring (≤30d)</div>
            </div>
            <div className={`stat-tile${d.expired > 0 ? " danger" : ""}`}>
              <div className="value">{d.expired}</div>
              <div className="label">Expired</div>
            </div>
            <div className="stat-tile">
              <div className="value">{d.byStatus["PENDING"] ?? 0}</div>
              <div className="label">Pending review</div>
            </div>
            <div className={`stat-tile${(d.byStatus["REJECTED"] ?? 0) > 0 ? " danger" : ""}`}>
              <div className="value">{d.byStatus["REJECTED"] ?? 0}</div>
              <div className="label">Rejected</div>
            </div>
          </div>
        </div>
      )}

      {d && (
        <div className="kpi-group">
          <h3>By entity type</h3>
          <div className="stat-row">
            {Object.entries(d.byEntityType).map(([type, count]) => (
              <div key={type} className="stat-tile">
                <div className="value">{count}</div>
                <div className="label">{type} documents</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Safety policies (all corporates)</h3>
        <table>
          <thead>
            <tr>
              <th>Corporate</th>
              <th>Policy name</th>
              <th>Version</th>
              <th>Active</th>
              <th>Rules</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td>
                  <a href={`/organisations/${p.organisation.id}`}>{p.organisation.displayName}</a>
                </td>
                <td>{p.name}</td>
                <td>v{p.version}</td>
                <td>
                  <span className={`badge${p.active ? " success" : ""}`}>{p.active ? "Active" : "Inactive"}</span>
                </td>
                <td>{p.rules.map((r) => r.type).join(", ") || "—"}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {policies.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No safety policies defined yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
