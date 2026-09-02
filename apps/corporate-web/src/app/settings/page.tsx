"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, CorporateSettings, CorporateMember, Organisation, NotificationChannelSet, CorporatePermission } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

const VEHICLE_CATEGORIES = ["SEDAN", "SUV", "VAN", "MINIBUS", "BUS"];
const RECIPIENT_TYPES = ["employee", "driver", "supervisor", "emergency"] as const;
const RECIPIENT_LABELS: Record<(typeof RECIPIENT_TYPES)[number], string> = {
  employee: "Employee",
  driver: "Driver",
  supervisor: "Supervisor",
  emergency: "Emergency",
};
const DEFAULT_CHANNELS: NotificationChannelSet = { push: true, sms: false, whatsapp: false, email: false, phoneEscalation: false };

const INVITABLE_ROLES = [
  { value: "CORPORATE_TRANSPORT_ADMIN", label: "Corporate Super Admin" },
  { value: "CORPORATE_TRANSPORT_MANAGER", label: "Transport Manager" },
  { value: "CORPORATE_TRANSPORT_SUPERVISOR", label: "Transport Supervisor" },
  { value: "CORPORATE_HR", label: "HR Admin" },
  { value: "CORPORATE_FINANCE", label: "Finance Manager" },
  { value: "CORPORATE_SAFETY_COMPLIANCE", label: "Safety / Compliance Manager" },
  { value: "CORPORATE_MANAGEMENT", label: "Management / Executive" },
  { value: "AUDITOR", label: "Auditor" },
];

const TABS = ["Organisation", "Company", "Contract", "Transport Policy", "Notifications", "Users & Roles", "Roles & Permissions"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("Company");
  const [settings, setSettings] = useState<CorporateSettings | null>(null);
  const [org, setOrg] = useState<Organisation | null>(null);
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
  const [channels, setChannels] = useState<Record<(typeof RECIPIENT_TYPES)[number], NotificationChannelSet>>({
    employee: { ...DEFAULT_CHANNELS },
    driver: { ...DEFAULT_CHANNELS },
    supervisor: { ...DEFAULT_CHANNELS },
    emergency: { ...DEFAULT_CHANNELS },
  });
  const [cutoffMinutes, setCutoffMinutes] = useState(30);
  const [allowSelfCancel, setAllowSelfCancel] = useState(true);
  const [maxRideTimeMinutes, setMaxRideTimeMinutes] = useState(60);
  const [cancellationCutoffMinutes, setCancellationCutoffMinutes] = useState(60);
  const [allowedVehicleCategories, setAllowedVehicleCategories] = useState<string[]>(VEHICLE_CATEGORIES);
  const [autoPlanningEnabled, setAutoPlanningEnabled] = useState(true);
  const [manualApprovalHeadcountThreshold, setManualApprovalHeadcountThreshold] = useState<number | "">("");

  const [members, setMembers] = useState<CorporateMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState(INVITABLE_ROLES[0].value);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<CorporatePermission[]>([]);

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
      setChannels({
        employee: { ...DEFAULT_CHANNELS, ...notif?.employee },
        driver: { ...DEFAULT_CHANNELS, ...notif?.driver },
        supervisor: { ...DEFAULT_CHANNELS, ...notif?.supervisor },
        emergency: { ...DEFAULT_CHANNELS, sms: true, phoneEscalation: true, ...notif?.emergency },
      });
      const policy = s.config?.transportPolicy;
      setCutoffMinutes(policy?.defaultCutoffMinutes ?? 30);
      setAllowSelfCancel(policy?.allowEmployeeSelfCancel ?? true);
      setMaxRideTimeMinutes(policy?.maxRideTimeMinutes ?? 60);
      setCancellationCutoffMinutes(policy?.cancellationCutoffMinutes ?? 60);
      setAllowedVehicleCategories(policy?.allowedVehicleCategories ?? VEHICLE_CATEGORIES);
      setAutoPlanningEnabled(policy?.autoPlanningEnabled ?? true);
      setManualApprovalHeadcountThreshold(policy?.manualApprovalHeadcountThreshold ?? "");
    }).catch(() => {});
  }

  function loadMembers() {
    if (!session) return;
    api.listCorporateUsers(session.accessToken).then(setMembers).catch(() => {});
  }

  useEffect(loadSettings, [session]);
  useEffect(() => {
    if (!session) return;
    api.getMyOrganisation(session.accessToken).then(setOrg).catch(() => {});
  }, [session]);
  useEffect(loadMembers, [session]);
  useEffect(() => {
    if (!session) return;
    api.listRolePermissions(session.accessToken).then(setPermissions).catch(() => {});
  }, [session]);

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
        config: { notificationSettings: channels },
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
        config: {
          transportPolicy: {
            defaultCutoffMinutes: cutoffMinutes,
            allowEmployeeSelfCancel: allowSelfCancel,
            maxRideTimeMinutes,
            cancellationCutoffMinutes,
            allowedVehicleCategories,
            autoPlanningEnabled,
            manualApprovalHeadcountThreshold: manualApprovalHeadcountThreshold === "" ? undefined : manualApprovalHeadcountThreshold,
          },
        },
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save transport policy");
    } finally {
      setBusy(false);
    }
  }

  function toggleVehicleCategory(cat: string) {
    setAllowedVehicleCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function toggleChannel(recipient: (typeof RECIPIENT_TYPES)[number], channel: keyof NotificationChannelSet) {
    setChannels((prev) => ({
      ...prev,
      [recipient]: { ...prev[recipient], [channel]: !prev[recipient][channel] },
    }));
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

      {tab === "Organisation" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Organisation</h3>
          <table>
            <tbody>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Legal name</td>
                <td>{org?.legalName ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Display name</td>
                <td>{org?.displayName ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Kruze ID</td>
                <td>{org?.globalOrgId ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Status</td>
                <td>
                  <span className="badge">{org?.status ?? "—"}</span>
                </td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Roles</td>
                <td>{org?.roles?.join(", ") ?? "—"}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12 }}>
            Sites, cities, timezone, and branding are managed by Kruze platform support — contact your Kruze account
            team to change them.
          </p>
        </div>
      )}

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
            <div className="field" style={{ marginBottom: 0, maxWidth: 220 }}>
              <label>Booking cut-off (min before shift)</label>
              <input type="number" min={0} value={cutoffMinutes} onChange={(e) => setCutoffMinutes(Number(e.target.value))} />
            </div>
            <div className="field" style={{ marginBottom: 0, maxWidth: 220 }}>
              <label>Cancellation cut-off (min before pickup)</label>
              <input type="number" min={0} value={cancellationCutoffMinutes} onChange={(e) => setCancellationCutoffMinutes(Number(e.target.value))} />
            </div>
            <div className="field" style={{ marginBottom: 0, maxWidth: 220 }}>
              <label>Maximum ride time (minutes)</label>
              <input type="number" min={0} value={maxRideTimeMinutes} onChange={(e) => setMaxRideTimeMinutes(Number(e.target.value))} />
            </div>
            <div className="field" style={{ marginBottom: 0, maxWidth: 260 }}>
              <label>Manual-approval headcount threshold (optional)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 500 — plans above this need manual approval"
                value={manualApprovalHeadcountThreshold}
                onChange={(e) => setManualApprovalHeadcountThreshold(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Allowed vehicle categories</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {VEHICLE_CATEGORIES.map((cat) => (
                <label key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={allowedVehicleCategories.includes(cat)}
                    onChange={() => toggleVehicleCategory(cat)}
                    style={{ width: "auto" }}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={allowSelfCancel}
                onChange={(e) => setAllowSelfCancel(e.target.checked)}
                style={{ width: "auto" }}
              />
              Employees may cancel their own roster entry
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={autoPlanningEnabled}
                onChange={(e) => setAutoPlanningEnabled(e.target.checked)}
                style={{ width: "auto" }}
              />
              Auto-planning enabled (Kruze plans automatically; disable to require manual planning)
            </label>
          </div>

          <button onClick={handleSaveTransportPolicy} disabled={busy} style={{ marginTop: 16 }}>
            Save
          </button>
          {saved && <span style={{ marginLeft: 12, color: "var(--text-muted)" }}>Saved.</span>}
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12 }}>
            Vendor rules and driver requirements are configured via Compliance → Required documents by resource type.
          </p>
        </div>
      )}

      {tab === "Notifications" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Notification channels</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Which channels Kruze uses to reach each recipient type for trip and safety alerts.
          </p>
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Push</th>
                <th>SMS</th>
                <th>WhatsApp</th>
                <th>Email</th>
                <th>Phone escalation</th>
              </tr>
            </thead>
            <tbody>
              {RECIPIENT_TYPES.map((recipient) => (
                <tr key={recipient}>
                  <td>{RECIPIENT_LABELS[recipient]}</td>
                  {(["push", "sms", "whatsapp", "email"] as const).map((channel) => (
                    <td key={channel}>
                      <input
                        type="checkbox"
                        checked={Boolean(channels[recipient][channel])}
                        onChange={() => toggleChannel(recipient, channel)}
                        style={{ width: "auto" }}
                      />
                    </td>
                  ))}
                  <td>
                    {recipient === "emergency" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(channels[recipient].phoneEscalation)}
                        onChange={() => toggleChannel(recipient, "phoneEscalation")}
                        style={{ width: "auto" }}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleSaveNotifications} disabled={busy} style={{ marginTop: 12 }}>
            Save
          </button>
          {saved && <span style={{ marginLeft: 12, color: "var(--text-muted)" }}>Saved.</span>}
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 12 }}>
            WhatsApp and phone escalation require the corresponding provider under Integrations.
          </p>
        </div>
      )}

      {tab === "Roles & Permissions" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Roles &amp; Permissions</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            What each role can do in this portal — this reflects the actual server-side access control, not just a
            description.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  {INVITABLE_ROLES.map((r) => (
                    <th key={r.value} style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.action}>
                    <td style={{ minWidth: 220 }}>
                      {p.action}
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.description}</div>
                    </td>
                    {INVITABLE_ROLES.map((r) => (
                      <td key={r.value} style={{ textAlign: "center" }}>
                        {p.roles.includes(r.value) ? "✓" : ""}
                      </td>
                    ))}
                  </tr>
                ))}
                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={INVITABLE_ROLES.length + 1} style={{ color: "var(--text-muted)" }}>
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
