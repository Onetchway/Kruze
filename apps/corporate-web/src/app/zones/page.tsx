"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Zone } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function ZonesPage() {
  const { session } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listZones(session.accessToken).then(setZones).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createZone(session.accessToken, { name, code });
      setName("");
      setCode("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add zone");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (!session) return;
    try {
      await api.removeZone(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove zone");
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Zones</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Billing zones used by Rate Cards to price trips by area — a named lookup value, not a geofence.
      </p>

      <div className="card">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="South Zone" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="Z-SOUTH" />
          </div>
          <button type="submit" disabled={busy}>
            Add zone
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id}>
                <td>{z.code}</td>
                <td>{z.name}</td>
                <td>
                  <span className="badge">{z.status}</span>
                </td>
                <td>
                  {z.status === "ACTIVE" && (
                    <button className="secondary" onClick={() => handleRemove(z.id)}>
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  No zones yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
