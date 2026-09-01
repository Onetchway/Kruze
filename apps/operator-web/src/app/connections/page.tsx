"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, OrganisationRelationship } from "@/lib/api";
import { Shell } from "@/components/Shell";

export default function ConnectionsPage() {
  const { session } = useAuth();
  const [relationships, setRelationships] = useState<OrganisationRelationship[]>([]);
  const [globalOrgId, setGlobalOrgId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listRelationships(session.accessToken).then(setRelationships).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const target = await api.lookupOrganisation(session.accessToken, globalOrgId.trim());
      await api.inviteRelationship(session.accessToken, { targetOrgId: target.id, type: "CORPORATE_VENDOR" });
      setGlobalOrgId("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to connect");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(relationshipId: string) {
    if (!session) return;
    setActionError(null);
    try {
      await api.acceptRelationship(session.accessToken, relationshipId);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to accept");
    }
  }

  return (
    <Shell>
      <h2 style={{ marginTop: 0 }}>Corporates</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Connect a corporate by their Kruze ID, or accept an invite a corporate has already sent you. Once active,
        your compliant fleet becomes eligible for their auto-plan.
      </p>

      <div className="card">
        <form onSubmit={handleInvite} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>Kruze ID (e.g. KZ-COR-000001)</label>
            <input value={globalOrgId} onChange={(e) => setGlobalOrgId(e.target.value)} required placeholder="KZ-COR-000001" />
          </div>
          <button type="submit" disabled={busy || !globalOrgId.trim()}>
            Connect
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Kruze ID</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {relationships.map((rel) => {
              const counterpart = rel.sourceOrgId === session?.organisationId ? rel.targetOrg : rel.sourceOrg;
              const canAccept = rel.status === "INVITED" && rel.targetOrgId === session?.organisationId;
              return (
                <tr key={rel.id}>
                  <td>{counterpart.displayName}</td>
                  <td>{counterpart.globalOrgId}</td>
                  <td>
                    <span className="badge">{rel.status}</span>
                  </td>
                  <td>{canAccept && <button onClick={() => handleAccept(rel.id)}>Accept</button>}</td>
                </tr>
              );
            })}
            {relationships.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  No connections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {actionError && <p className="error-text">{actionError}</p>}
      </div>
    </Shell>
  );
}
