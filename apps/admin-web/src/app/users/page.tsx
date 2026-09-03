"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Organisation, PlatformUserRow } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const PLATFORM_ROLES = [
  "PLATFORM_OWNER",
  "PLATFORM_OPERATIONS_ADMIN",
  "SUPPORT_ADMIN",
  "BILLING_ADMIN",
  "SECURITY_ADMIN",
  "COMPLIANCE_ADMIN",
  "READ_ONLY_SUPER_ADMIN",
  "TENANT_ADMIN",
  "CORPORATE_TRANSPORT_ADMIN",
  "CORPORATE_MANAGEMENT",
  "FLEET_OPERATOR_ADMIN",
  "VENDOR_ADMIN",
  "AUDITOR",
];

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageInner />
    </Suspense>
  );
}

function UsersPageInner() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const initialOrg = searchParams.get("organisationId") ?? "";

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [orgFilter, setOrgFilter] = useState(initialOrg);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PlatformUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteOrg, setInviteOrg] = useState(initialOrg);
  const [inviteRole, setInviteRole] = useState(PLATFORM_ROLES[0]);

  useEffect(() => {
    if (!session) return;
    api.listOrganisations(session.accessToken).then(setOrganisations).catch(() => {});
  }, [session]);

  function reload() {
    if (!session) return;
    api
      .listPlatformUsers(session.accessToken, { organisationId: orgFilter || undefined, q: q || undefined })
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load users"));
  }

  useEffect(reload, [session, orgFilter]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !inviteOrg) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.invitePlatformUser(session.accessToken, {
        email: inviteEmail,
        displayName: inviteName,
        organisationId: inviteOrg,
        role: inviteRole,
      });
      setNotice(
        result.temporaryPassword
          ? `Account created. Temporary password: ${result.temporaryPassword} (share out of band — not shown again).`
          : "Existing account granted the new membership.",
      );
      setInviteEmail("");
      setInviteName("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to invite user");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable(userId: string) {
    if (!session) return;
    setError(null);
    try {
      await api.disablePlatformUser(session.accessToken, userId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to disable user");
    }
  }

  async function handleEnable(userId: string) {
    if (!session) return;
    setError(null);
    try {
      await api.enablePlatformUser(session.accessToken, userId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to enable user");
    }
  }

  async function handleRoleChange(membershipId: string, role: string) {
    if (!session) return;
    setError(null);
    try {
      await api.changeMembershipRole(session.accessToken, membershipId, role);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change role");
    }
  }

  return (
    <ProtectedShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>Users & Access</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
            Cross-tenant user management. See <a href="/roles">Roles & Permission Matrix →</a> for the 7 Super Admin
            roles and what each may do.
          </p>
        </div>
        <button onClick={() => setShowInvite((v) => !v)}>{showInvite ? "Cancel" : "+ Invite user"}</button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {notice && <p style={{ color: "var(--success)", fontSize: 13 }}>{notice}</p>}

      {showInvite && (
        <div className="card">
          <form onSubmit={handleInvite} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Display name</label>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Organisation</label>
              <select value={inviteOrg} onChange={(e) => setInviteOrg(e.target.value)} required>
                <option value="">Select…</option>
                {organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.displayName} ({o.globalOrgId})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                {PLATFORM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button type="submit" disabled={busy || !inviteOrg}>
                Invite
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>Organisation</label>
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
              <option value="">All organisations</option>
              {organisations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>Search</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && reload()} placeholder="Name or email" />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button className="secondary" onClick={reload}>
              Search
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Organisation</th>
              <th>Role</th>
              <th>Account status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.user.displayName}</td>
                <td>{m.user.email ?? m.user.phone ?? "—"}</td>
                <td>
                  <a href={`/organisations/${m.organisation.id}`}>{m.organisation.displayName}</a>
                </td>
                <td>
                  <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)}>
                    {PLATFORM_ROLES.includes(m.role) ? null : <option value={m.role}>{m.role}</option>}
                    {PLATFORM_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className={`badge${m.user.status === "ACTIVE" ? " success" : m.user.status === "SUSPENDED" ? " danger" : ""}`}>
                    {m.user.status}
                  </span>
                </td>
                <td>
                  {m.user.status === "ACTIVE" ? (
                    <button className="secondary" onClick={() => handleDisable(m.user.id)}>
                      Disable
                    </button>
                  ) : (
                    <button onClick={() => handleEnable(m.user.id)}>Enable</button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
