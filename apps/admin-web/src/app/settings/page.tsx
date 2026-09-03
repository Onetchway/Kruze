"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, PlatformBranding } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function PlatformSettingsPage() {
  const { session } = useAuth();
  const [branding, setBranding] = useState<PlatformBranding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    api.getPlatformBranding(session.accessToken).then(setBranding).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [session]);

  function setField<K extends keyof PlatformBranding>(key: K, value: PlatformBranding[K]) {
    setBranding((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !branding) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.setPlatformBranding(session.accessToken, branding);
      setBranding(saved);
      setNotice("Saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Platform Settings</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Platform-level branding, timezone, currency and language defaults — stored as a single versioned config row,
        change history kept append-only.
      </p>

      {error && <p className="error-text">{error}</p>}
      {notice && <p style={{ color: "var(--success)", fontSize: 13 }}>{notice}</p>}

      {branding && (
        <form className="card" style={{ maxWidth: 480 }} onSubmit={save}>
          <div className="field">
            <label>Platform name</label>
            <input value={branding.platformName} onChange={(e) => setField("platformName", e.target.value)} />
          </div>
          <div className="field">
            <label>Default timezone</label>
            <input value={branding.timezone} onChange={(e) => setField("timezone", e.target.value)} placeholder="Asia/Kolkata" />
          </div>
          <div className="field">
            <label>Default currency</label>
            <input value={branding.currency} onChange={(e) => setField("currency", e.target.value)} placeholder="INR" />
          </div>
          <div className="field">
            <label>Default language</label>
            <input value={branding.language} onChange={(e) => setField("language", e.target.value)} placeholder="en" />
          </div>
          <div className="field">
            <label>Logo URL</label>
            <input value={branding.logoUrl ?? ""} onChange={(e) => setField("logoUrl", e.target.value || null)} />
          </div>
          <button type="submit" disabled={busy} style={{ marginTop: 8 }}>
            Save
          </button>
        </form>
      )}
    </ProtectedShell>
  );
}
