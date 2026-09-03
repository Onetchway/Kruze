"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  api,
  ApiError,
  Organisation,
  OrganisationStats,
  OrganisationMembershipRow,
  OrganisationRelationshipRow,
} from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

type Tab = "overview" | "users" | "relationships";

export default function OrganisationDetailPage() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const orgId = params.id;

  const [tab, setTab] = useState<Tab>("overview");
  const [org, setOrg] = useState<Organisation | null>(null);
  const [stats, setStats] = useState<OrganisationStats | null>(null);
  const [users, setUsers] = useState<OrganisationMembershipRow[]>([]);
  const [relationships, setRelationships] = useState<OrganisationRelationshipRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);

  function reload() {
    if (!session || !orgId) return;
    api.getOrganisation(session.accessToken, orgId).then(setOrg).catch(() => {});
    api.getOrganisationStats(session.accessToken, orgId).then(setStats).catch(() => {});
    api.getOrganisationUsers(session.accessToken, orgId).then(setUsers).catch(() => {});
    api.getOrganisationRelationships(session.accessToken, orgId).then(setRelationships).catch(() => {});
  }

  useEffect(reload, [session, orgId]);

  async function handleSuspend() {
    if (!session || !suspendReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.suspendOrganisation(session.accessToken, orgId, suspendReason.trim());
      setShowSuspend(false);
      setSuspendReason("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to suspend");
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.reactivateOrganisation(session.accessToken, orgId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reactivate");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.approveOrganisation(session.accessToken, orgId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  if (!org) {
    return (
      <ProtectedShell>
        <p style={{ color: "var(--text-muted)" }}>Loading tenant…</p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <p style={{ marginTop: 0 }}>
        <a href="/organisations">← Organisations</a>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>{org.displayName}</h2>
          <p className="mono" style={{ color: "var(--text-muted)", margin: 0 }}>
            {org.globalOrgId} · {org.roles.join(", ")}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            className={`badge${org.status === "ACTIVE" ? " success" : org.status === "SUSPENDED" ? " danger" : org.status === "PENDING_APPROVAL" ? " warning" : ""}`}
          >
            {org.status}
          </span>
          <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {org.status === "PENDING_APPROVAL" && (
              <button disabled={busy} onClick={handleApprove}>
                Approve
              </button>
            )}
            {org.status !== "SUSPENDED" ? (
              <button className="secondary" onClick={() => setShowSuspend((v) => !v)}>
                Suspend tenant
              </button>
            ) : (
              <button disabled={busy} onClick={handleReactivate}>
                Reactivate tenant
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {showSuspend && (
        <div className="card">
          <div className="field">
            <label>Suspension reason</label>
            <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="e.g. non-payment, policy violation" />
          </div>
          <button disabled={busy || !suspendReason.trim()} onClick={handleSuspend}>
            Confirm suspension
          </button>
        </div>
      )}

      {org.status === "SUSPENDED" && org.suspendedReason && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <strong>Suspended</strong> — {org.suspendedReason}
          {org.suspendedAt && <span style={{ color: "var(--text-muted)" }}> on {new Date(org.suspendedAt).toLocaleString()}</span>}
        </div>
      )}

      <div className="tabs">
        {(["overview", "users", "relationships"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="stat-row">
            <div className="stat-tile">
              <div className="value">{stats?.userCount ?? "—"}</div>
              <div className="label">Active users</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats?.employeeCount ?? "—"}</div>
              <div className="label">Employees</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats?.activeRelationshipCount ?? "—"}</div>
              <div className="label">Active relationships</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats?.tripCount ?? "—"}</div>
              <div className="label">Trips (all-time)</div>
            </div>
            <div className="stat-tile">
              <div className="value">{(stats?.driverRelationshipCount ?? 0) + (stats?.vehicleRelationshipCount ?? 0) + (stats?.guardRelationshipCount ?? 0)}</div>
              <div className="label">Vendor resource links</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Profile</h3>
            <table>
              <tbody>
                <tr><td>Legal name</td><td>{org.legalName}</td></tr>
                <tr><td>Registration number</td><td>{org.registrationNumber ?? "—"}</td></tr>
                <tr><td>GSTIN / PAN</td><td>{org.gstin ?? "—"} / {org.pan ?? "—"}</td></tr>
                <tr><td>Address</td><td>{[org.addressLine, org.city, org.state, org.country, org.postalCode].filter(Boolean).join(", ") || "—"}</td></tr>
                <tr><td>Primary contact</td><td>{org.primaryContactName ?? "—"} {org.primaryContactEmail ? `· ${org.primaryContactEmail}` : ""} {org.primaryContactPhone ? `· ${org.primaryContactPhone}` : ""}</td></tr>
                <tr><td>Website</td><td>{org.website ?? "—"}</td></tr>
                <tr><td>Timezone / Currency / Language</td><td>{org.timezone ?? "—"} / {org.currency ?? "—"} / {org.language ?? "—"}</td></tr>
                <tr><td>Industry</td><td>{org.industry ?? "—"}</td></tr>
                <tr><td>Employee count / Fleet size</td><td>{org.employeeCount ?? "—"} / {org.fleetSize ?? "—"}</td></tr>
                <tr><td>Created</td><td>{new Date(org.createdAt).toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>

          {stats?.subscription && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Subscription</h3>
              <p>
                Plan: <strong>{stats.subscription.plan?.name}</strong> — <span className="badge">{stats.subscription.status}</span>
              </p>
              <p style={{ color: "var(--text-muted)" }}>
                <a href="/subscriptions">Manage on the Subscriptions page →</a>
              </p>
            </div>
          )}
        </>
      )}

      {tab === "users" && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {users.map((m) => (
                <tr key={m.id}>
                  <td>{m.user.displayName}</td>
                  <td>{m.user.email ?? m.user.phone ?? "—"}</td>
                  <td>{m.role}</td>
                  <td>
                    <span className={`badge${m.status === "ACTIVE" ? " success" : m.status === "SUSPENDED" ? " danger" : ""}`}>{m.status}</span>
                  </td>
                  <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 12 }}>
            <a href={`/users?organisationId=${orgId}`}>Manage users for this tenant →</a>
          </p>
        </div>
      )}

      {tab === "relationships" && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Counterparty</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((r) => {
                const isSource = r.sourceOrg.id === orgId;
                const other = isSource ? r.targetOrg : r.sourceOrg;
                return (
                  <tr key={r.id}>
                    <td>{r.type}</td>
                    <td>
                      {other.displayName} <span className="mono" style={{ color: "var(--text-muted)" }}>({other.globalOrgId})</span>
                    </td>
                    <td>{isSource ? "Outbound" : "Inbound"}</td>
                    <td>
                      <span className={`badge${r.status === "ACTIVE" ? " success" : r.status === "TERMINATED" ? " danger" : ""}`}>{r.status}</span>
                    </td>
                    <td>{r.startsAt ? new Date(r.startsAt).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })}
              {relationships.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                    No relationships yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedShell>
  );
}
