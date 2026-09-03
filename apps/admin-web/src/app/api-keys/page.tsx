"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ApiKeyRow } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function ApiKeysPage() {
  const { session } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("");
  const [saving, setSaving] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reload() {
    if (!session) return;
    api.listApiKeys(session.accessToken).then(setKeys).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load API keys"));
  }

  useEffect(reload, [session]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createApiKey(session.accessToken, {
        name: name.trim(),
        scopes: scopes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setNewSecret(created.secret);
      setName("");
      setScopes("");
      setShowForm(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create key");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(id: string) {
    if (!session) return;
    setBusyId(id);
    setError(null);
    try {
      await api.revokeApiKey(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to revoke key");
    } finally {
      setBusyId(null);
    }
  }

  function copySecret() {
    if (!newSecret) return;
    navigator.clipboard?.writeText(newSecret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <ProtectedShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>API Keys</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
            Minimal API key management (spec §51 bare slice) — bare create/list/revoke. No OAuth apps, no webhook
            delivery, no rate limiting, and no API versioning in this pass.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Create key"}</button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {newSecret && (
        <div className="card" style={{ borderColor: "var(--warning)" }}>
          <strong>New key secret — copy it now, it will not be shown again.</strong>
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <code
              className="mono"
              style={{ background: "var(--surface-alt, #f2f4fa)", padding: "6px 10px", borderRadius: 6, wordBreak: "break-all", flex: 1 }}
            >
              {newSecret}
            </code>
            <button className="secondary" onClick={copySecret}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button className="secondary" style={{ marginTop: 10 }} onClick={() => setNewSecret(null)}>
            I&apos;ve saved it, dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="card">
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Key name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ERP integration" required />
            </div>
            <div className="field">
              <label>Scopes (comma-separated, optional)</label>
              <input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="e.g. trips:read, invoices:read" />
            </div>
            <div>
              <button type="submit" disabled={saving || !name.trim()}>
                Generate key
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Scopes</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last used</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td className="mono">{k.keyPrefix}…</td>
                <td>{k.scopes.length ? k.scopes.join(", ") : "—"}</td>
                <td>
                  <span className={`badge${k.status === "ACTIVE" ? " success" : " danger"}`}>{k.status}</span>
                </td>
                <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}</td>
                <td>
                  {k.status === "ACTIVE" && (
                    <button disabled={busyId === k.id} className="secondary" onClick={() => revoke(k.id)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
