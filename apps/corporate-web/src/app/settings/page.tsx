"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, CorporateSettings, CorporateMember } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

const INVITABLE_ROLES = [
  { value: "CORPORATE_TRANSPORT_ADMIN", label: "Transport Admin" },
  { value: "CORPORATE_HR", label: "HR Admin" },
  { value: "CORPORATE_FINANCE", label: "Finance Manager" },
  { value: "CORPORATE_SAFETY_COMPLIANCE", label: "Safety / Compliance Manager" },
  { value: "AUDITOR", label: "Auditor" },
];

const TABS = ["Company", "Contract", "Transport Policy", "Notifications", "Users & Roles"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("Company");
  const [settings, setSettings] = useState<CorporateSettings | null>(null);
  const [form, setForm] = useState({
    address: "",
    contactPersonName: "",
    contactEmail: "",
    contactPhone: "",
    contractStartsAt: "",
    contractEndsAt: "",
    paymentTerms: "",
    employeePickupChangeLimit: 1,
  });
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [cutoffMinutes, setCutoffMinutes] = useState(30);
  const [allowSelfCancel, setAllowSelfCancel] = useState(true);

  const [members, setMembers] = useState<CorporateMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState(INVITABLE_ROLES[0].value);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function loadSettings() {
    if (!session) return;
    api.getCorporateSettings(session.accessToken).then((s) => {
      setSettings(s);
      setForm({
        address: s.address ?? "",
        contactPersonName: s.contactPersonName ?? "",
        contactEmail: s.contactEmail ?? "",
        contactPhone: s.contactPhone ?? "",
        contractStartsAt: toDateInput(s.contractStartsAt),
        contractEndsAt: toDateInput(s.contractEndsAt),
        paymentTerms: s.paymentTerms ?? "",
        employeePickupChangeLimit: s.employeePickupChangeLimit,
      });
      const notif = s.config?.notificationSettings;
      setNotifyPush(notif?.push ?? true);
      setNotifySms(notif?.sms ?? true);
      setNotifyWhatsapp(notif?.whatsapp ?? false);
      setNotifyEmail(notif?.email ?? true);
      const policy = s.config?.transportPolicy;
      setCutoffMinutes(policy?.defaultCutoffMinutes ?? 30);
      setAllowSelfCancel(policy?.allowEmployeeSelfCancel ?? true);
    }).catch(() => {});
  }

  function loadMembers() {
    if (!session) return;
    api.listCorporateUsers(session.accessToken).then(setMembers).catch(() => {});
  }

  useEffect(loadSettings, [session]);
  useEffect(loadMembers, [session]);

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateCorporateSettings(session.accessToken, {
        address: form.address || undefined,
        contactPersonName: form.contactPersonName || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        contractStartsAt: form.contractStartsAt || undefined,
        contractEndsAt: form.contractEndsAt || undefined,
        paymentTerms: form.paymentTerms || undefined,
        employeePickupChangeLimit: form.employeePickupChangeLimit,
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveNotifications() {
    if (!session) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateCorporateSettings(session.accessToken, {
        config: { notificationSettings: { push: notifyPush, sms: notifySms, whatsapp: notifyWhatsapp, email: notifyEmail } },
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save notification settings");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTransportPolicy() {
    if (!session) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateCorporateSettings(session.accessToken, {
        config: { transportPolicy: { defaultCutoffMinutes: cutoffMinutes, allowEmployeeSelfCancel: allowSelfCancel } },
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save transport policy");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite() {
    if (!session || !inviteEmail || !inviteName) return;
    setBusy(true);
    setError(null);
    setTempPassword(null);
    try {
      const result = await api.inviteCorporateUser(session.accessToken, {
        email: inviteEmail,
        displayName: inviteName,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteName("");
      setTempPassword(result.temporaryPassword);
      loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to invite user");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus(m: CorporateMember) {
    if (!session) return;
    try {
      if (m.status === "ACTIVE") {
        await api.suspendCorporateUser(session.accessToken, m.id);
      } else {
        await api.reactivateCorporateUser(session.accessToken, m.id);
      }
      loadMembers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user status");
    }
  }

  return (
    <ProtectedShell title="Settings" subtitle="Company details, transport policy, notifications, and your team's access.">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "" : "secondary"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {error && tab !== "Users & Roles" && <p className="error-text">{error}</p>}

      {tab === "Company" && (
        <div className="card">
          <form onSubmit={handleSaveCompany}>
            <h3 style={{ marginTop: 0 }}>Company details</h3>
            <div className="field">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="field" style={{ flex: 1, minWidth: 200 }}>
                <label>Contact person</label>
                <input value={form.contactPersonName} onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 200 }}>
                <label>Contact email</label>
                <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 200 }}>
                <label>Contact phone</label>
                <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
            </div>

            <h3>Employee self-service</h3>
            <div className="field" style={{ maxWidth: 260 }}>
              <label>Pickup location change limit</label>
              <input
                type="number"
                min={0}
                value={form.employeePickupChangeLimit}
                onChange={(e) => setForm({ ...form, employeePickupChangeLimit: Number(e.target.value) })}
              />
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 0 }}>
                How many times an employee may change their own pickup location.
              </p>
            </div>

            <button type="submit" disabled={busy}>
              Save
            </button>
            {saved && <span style={{ marginLeft: 12, color: "var(--text-muted)" }}>Saved.</span>}
          </form>
        </div>
      )}

      {tab === "Contract" && (
        <div className="card">
          <form onSubmit={handleSaveCompany}>
            <h3 style={{ marginTop: 0 }}>Contract</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="field" style={{ flex: 1, minWidth: 160 }}>
                <label>Contract start</label>
                <input type="date" value={form.contractStartsAt} onChange={(e) => setForm({ ...form, contractStartsAt: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 160 }}>
                <label>Contract end</label>
                <input type="date" value={form.contractEndsAt} onChange={(e) => setForm({ ...form, contractEndsAt: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 200 }}>
                <label>Payment terms</label>
                <input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="e.g. Net 30" />
              </div>
            </div>
            <button type="submit" disabled={busy}>
              Save
            </button>
            {saved && <span style={{ marginLeft: 12, color: "var(--text-muted)" }}>Saved.</span>}
          </form>
        </div>
      )}

      {tab === "Transport Policy" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Transport policy</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ marginBottom: 0, maxWidth: 260 }}>
              <label>Default booking cut-off (minutes before shift start)</label>
              <input type="number" min={0} value={cutoffMinutes} onChange={(e) => setCutoffMinutes(Number(e.target.value))} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>
                <input
                  type="checkbox"
                  checked={allowSelfCancel}
                  onChange={(e) => setAllowSelfCancel(e.target.checked)}
                  style={{ width: "auto", marginRight: 6, verticalAlign: "middle" }}
                />
                Employees may cancel their own roster entry
              </label>
            </div>
          </div>
          <button onClick={handleSaveTransportPolicy} disabled={busy} style={{ marginTop: 12 }}>
            Save
          </button>
          {saved && <span style={{ marginLeft: 12, color: "var(--text-muted)" }}>Saved.</span>}
        </div>
      )}

      {tab === "Notifications" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Notification channels</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Which channels Kruze uses to reach employees, drivers, and guards for trip and safety alerts.
          </p>
          {[
            { key: "push", label: "Push (app)", value: notifyPush, set: setNotifyPush },
            { key: "sms", label: "SMS", value: notifySms, set: setNotifySms },
            { key: "whatsapp", label: "WhatsApp (requires Integrations setup)", value: notifyWhatsapp, set: setNotifyWhatsapp },
            { key: "email", label: "Email", value: notifyEmail, set: setNotifyEmail },
          ].map((c) => (
            <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <input type="checkbox" checked={c.value} onChange={(e) => c.set(e.target.checked)} style={{ width: "auto" }} />
              {c.label}
            </label>
          ))}
          <button onClick={handleSaveNotifications} disabled={busy} style={{ marginTop: 8 }}>
            Save
          </button>
          {saved && <span style={{ marginLeft: 12, color: "var(--text-muted)" }}>Saved.</span>}
        </div>
      )}

      {tab === "Users & Roles" && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Invite a teammate</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No email provider is configured in this environment — inviting creates the account directly and shows a
              one-time temporary password for you to share with them.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
                <label>Name</label>
                <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
                <label>Email</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
                <label>Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleInvite} disabled={busy || !inviteEmail || !inviteName}>
                Invite
              </button>
            </div>
            {tempPassword && (
              <p style={{ marginTop: 12, fontSize: 13 }}>
                Account created. One-time temporary password: <code>{tempPassword}</code>
              </p>
            )}
            {error && <p className="error-text">{error}</p>}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Team members</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.user.displayName}</td>
                    <td>{m.user.email}</td>
                    <td>{INVITABLE_ROLES.find((r) => r.value === m.role)?.label ?? m.role.replaceAll("_", " ")}</td>
                    <td>
                      <span className="badge">{m.status}</span>
                    </td>
                    <td>
                      <button className="secondary" onClick={() => handleToggleStatus(m)}>
                        {m.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                      No members yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProtectedShell>
  );
}
