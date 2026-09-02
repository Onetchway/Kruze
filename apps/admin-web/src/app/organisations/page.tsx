"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Organisation } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const ORG_ROLES = ["CORPORATE", "FLEET_OPERATOR", "VENDOR", "SUB_VENDOR"];

const emptyForm = {
  legalName: "",
  displayName: "",
  role: "CORPORATE",
  registrationNumber: "",
  gstin: "",
  pan: "",
  addressLine: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  website: "",
  timezone: "",
  currency: "",
  language: "",
  industry: "",
  employeeCount: "",
  fleetSize: "",
  logoUrl: "",
};

export default function OrganisationsPage() {
  const { session } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

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

  function setField<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.adminCreateOrganisation(session.accessToken, {
        legalName: form.legalName,
        displayName: form.displayName,
        roles: [form.role],
        registrationNumber: form.registrationNumber || undefined,
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
        addressLine: form.addressLine || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        postalCode: form.postalCode || undefined,
        primaryContactName: form.primaryContactName || undefined,
        primaryContactEmail: form.primaryContactEmail || undefined,
        primaryContactPhone: form.primaryContactPhone || undefined,
        website: form.website || undefined,
        timezone: form.timezone || undefined,
        currency: form.currency || undefined,
        language: form.language || undefined,
        industry: form.industry || undefined,
        employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
        fleetSize: form.fleetSize ? Number(form.fleetSize) : undefined,
        logoUrl: form.logoUrl || undefined,
      });
      setForm(emptyForm);
      setShowCreate(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create organisation");
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = organisations.filter((o) => o.status === "PENDING_APPROVAL").length;

  return (
    <ProtectedShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Organisations</h2>
        <button onClick={() => setShowCreate((v) => !v)}>{showCreate ? "Cancel" : "+ New tenant"}</button>
      </div>

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

      {showCreate && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Create tenant (spec §7)</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Legal name</label>
                <input value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} required />
              </div>
              <div className="field">
                <label>Display name</label>
                <input value={form.displayName} onChange={(e) => setField("displayName", e.target.value)} required />
              </div>
              <div className="field">
                <label>Organisation type</label>
                <select value={form.role} onChange={(e) => setField("role", e.target.value)}>
                  {ORG_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Industry</label>
                <input value={form.industry} onChange={(e) => setField("industry", e.target.value)} />
              </div>
              <div className="field">
                <label>Registration number</label>
                <input value={form.registrationNumber} onChange={(e) => setField("registrationNumber", e.target.value)} />
              </div>
              <div className="field">
                <label>GSTIN</label>
                <input value={form.gstin} onChange={(e) => setField("gstin", e.target.value)} />
              </div>
              <div className="field">
                <label>PAN</label>
                <input value={form.pan} onChange={(e) => setField("pan", e.target.value)} />
              </div>
              <div className="field">
                <label>Website</label>
                <input value={form.website} onChange={(e) => setField("website", e.target.value)} />
              </div>
              <div className="field">
                <label>Address line</label>
                <input value={form.addressLine} onChange={(e) => setField("addressLine", e.target.value)} />
              </div>
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={(e) => setField("city", e.target.value)} />
              </div>
              <div className="field">
                <label>State</label>
                <input value={form.state} onChange={(e) => setField("state", e.target.value)} />
              </div>
              <div className="field">
                <label>Country</label>
                <input value={form.country} onChange={(e) => setField("country", e.target.value)} />
              </div>
              <div className="field">
                <label>Postal code</label>
                <input value={form.postalCode} onChange={(e) => setField("postalCode", e.target.value)} />
              </div>
              <div className="field">
                <label>Timezone</label>
                <input value={form.timezone} onChange={(e) => setField("timezone", e.target.value)} placeholder="Asia/Kolkata" />
              </div>
              <div className="field">
                <label>Currency</label>
                <input value={form.currency} onChange={(e) => setField("currency", e.target.value)} placeholder="INR" />
              </div>
              <div className="field">
                <label>Language</label>
                <input value={form.language} onChange={(e) => setField("language", e.target.value)} placeholder="en" />
              </div>
              <div className="field">
                <label>Primary contact name</label>
                <input value={form.primaryContactName} onChange={(e) => setField("primaryContactName", e.target.value)} />
              </div>
              <div className="field">
                <label>Primary contact email</label>
                <input value={form.primaryContactEmail} onChange={(e) => setField("primaryContactEmail", e.target.value)} type="email" />
              </div>
              <div className="field">
                <label>Primary contact phone</label>
                <input value={form.primaryContactPhone} onChange={(e) => setField("primaryContactPhone", e.target.value)} />
              </div>
              <div className="field">
                <label>Employee count</label>
                <input value={form.employeeCount} onChange={(e) => setField("employeeCount", e.target.value)} type="number" min={0} />
              </div>
              <div className="field">
                <label>Fleet size</label>
                <input value={form.fleetSize} onChange={(e) => setField("fleetSize", e.target.value)} type="number" min={0} />
              </div>
              <div className="field">
                <label>Logo URL</label>
                <input value={form.logoUrl} onChange={(e) => setField("logoUrl", e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={busy} style={{ marginTop: 8 }}>
              Create tenant (active immediately)
            </button>
          </form>
        </div>
      )}

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
                <td className="mono">{o.globalOrgId}</td>
                <td>
                  <a href={`/organisations/${o.id}`}>{o.displayName}</a>
                </td>
                <td>{o.roles.join(", ")}</td>
                <td>
                  <span
                    className={`badge${o.status === "PENDING_APPROVAL" ? " warning" : o.status === "ACTIVE" ? " success" : o.status === "SUSPENDED" ? " danger" : ""}`}
                  >
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
