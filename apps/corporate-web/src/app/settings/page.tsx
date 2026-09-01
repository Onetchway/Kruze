"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, CorporateSettings } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export default function SettingsPage() {
  const { session } = useAuth();
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
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    api
      .getCorporateSettings(session.accessToken)
      .then((s) => {
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
      })
      .catch(() => {});
  }, [session]);

  async function handleSave(e: React.FormEvent) {
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

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Settings</h2>

      <div className="card">
        <form onSubmit={handleSave}>
          <h3 style={{ marginTop: 0 }}>Company details</h3>
          <div className="field">
            <label>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 200 }}>
              <label>Contact person</label>
              <input
                value={form.contactPersonName}
                onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 200 }}>
              <label>Contact email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 200 }}>
              <label>Contact phone</label>
              <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
          </div>

          <h3>Contract</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label>Contract start</label>
              <input
                type="date"
                value={form.contractStartsAt}
                onChange={(e) => setForm({ ...form, contractStartsAt: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label>Contract end</label>
              <input
                type="date"
                value={form.contractEndsAt}
                onChange={(e) => setForm({ ...form, contractEndsAt: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 200 }}>
              <label>Payment terms</label>
              <input
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                placeholder="e.g. Net 30"
              />
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
            Save settings
          </button>
          {saved && <span style={{ marginLeft: 12, color: "var(--text-muted)" }}>Saved.</span>}
        </form>
        {error && <p className="error-text">{error}</p>}
        {settings && (
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16 }}>
            Last updated by this organisation&rsquo;s Corporate Transport Admin.
          </p>
        )}
      </div>
    </ProtectedShell>
  );
}
