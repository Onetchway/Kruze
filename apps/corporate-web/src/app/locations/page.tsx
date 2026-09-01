"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Location } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function LocationsPage() {
  const { session } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listLocations(session.accessToken).then(setLocations).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createLocation(session.accessToken, {
        name,
        code,
        address: address || undefined,
        city: city || undefined,
      });
      setName("");
      setCode("");
      setAddress("");
      setCity("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add drop location");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (!session) return;
    try {
      await api.removeLocation(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove drop location");
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Drop Locations</h2>

      <div className="card">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="HQ Office" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="HQ" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <button type="submit" disabled={busy}>
            Add location
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
              <th>City</th>
              <th>Address</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id}>
                <td>{l.code}</td>
                <td>{l.name}</td>
                <td>{l.city ?? "—"}</td>
                <td>{l.address ?? "—"}</td>
                <td>
                  <span className="badge">{l.status}</span>
                </td>
                <td>
                  {l.status === "ACTIVE" && (
                    <button className="secondary" onClick={() => handleRemove(l.id)}>
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No drop locations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
