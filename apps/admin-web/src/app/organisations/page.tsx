"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Organisation } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function OrganisationsPage() {
  const { session } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listOrganisations(session.accessToken).then(setOrganisations).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleApprove(id: string) {
    if (!session) return;
    setError(null);
    try {
      await api.approveOrganisation(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    }
  }

  const pendingCount = organisations.filter((o) => o.status === "PENDING_APPROVAL").length;

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Organisations</h2>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{organisations.length}</div>
          <div className="label">Total organisations</div>
        </div>
        <div className={`stat-tile${pendingCount > 0 ? " warning" : ""}`}>
          <div className="value">{pendingCount}</div>
          <div className="label">Pending approval</div>
        </div>
      </div>

      <div className="card">
        {error && <p className="error-text">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Kruze ID</th>
              <th>Name</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {organisations.map((o) => (
              <tr key={o.id}>
                <td>{o.globalOrgId}</td>
                <td>{o.displayName}</td>
                <td>{o.roles.join(", ")}</td>
                <td>
                  <span className={`badge${o.status === "PENDING_APPROVAL" ? " warning" : o.status === "ACTIVE" ? " success" : ""}`}>
                    {o.status}
                  </span>
                </td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td>
                  {o.status === "PENDING_APPROVAL" && <button onClick={() => handleApprove(o.id)}>Approve</button>}
                </td>
              </tr>
            ))}
            {organisations.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No organisations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
