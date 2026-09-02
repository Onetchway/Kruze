"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, PlatformPermission } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  KRUZE_SUPER_ADMIN: "Legacy/root role — superset of every platform capability.",
  PLATFORM_OWNER: "Full control of the Kruze platform.",
  PLATFORM_OPERATIONS_ADMIN: "Monitors tenants/system health, investigates failed jobs, manages integrations.",
  SUPPORT_ADMIN: "Investigates customer issues, resets invitations, controlled impersonation.",
  BILLING_ADMIN: "Manages plans, subscriptions, usage, invoices, revenue reports.",
  SECURITY_ADMIN: "Security events, security policy, audit logs, privileged access.",
  COMPLIANCE_ADMIN: "Document types, compliance rules, expiry rules, regulatory configuration.",
  READ_ONLY_SUPER_ADMIN: "View-only across organisations, users, subscriptions, analytics, audit.",
};

export default function RolesPage() {
  const { session } = useAuth();
  const [matrix, setMatrix] = useState<PlatformPermission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api
      .getPlatformRolePermissions(session.accessToken)
      .then(setMatrix)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load role matrix"));
  }, [session]);

  const roles = Object.keys(ROLE_DESCRIPTIONS);

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Super Admin Roles</h2>
      <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
        The seven Super Admin roles (spec §2) and the action/permission matrix that governs them — this is the same
        matrix RolesGuard enforces on every platform endpoint, not a separately-maintained description.
      </p>
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r}>
                <td className="mono">{r}</td>
                <td>{ROLE_DESCRIPTIONS[r]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Permission matrix</h3>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Description</th>
              <th>Roles</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((p) => (
              <tr key={p.action}>
                <td>{p.action}</td>
                <td style={{ color: "var(--text-muted)" }}>{p.description}</td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {p.roles.join(", ")}
                </td>
              </tr>
            ))}
            {matrix.length === 0 && !error && (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
