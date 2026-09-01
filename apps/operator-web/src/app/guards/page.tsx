"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Guard } from "@/lib/api";
import { Shell } from "@/components/Shell";

export default function GuardsPage() {
  const { session } = useAuth();
  const [guards, setGuards] = useState<Guard[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listGuards(session.accessToken).then(setGuards).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createGuard(session.accessToken, { fullName, phone });
      setFullName("");
      setPhone("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add guard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h2 style={{ marginTop: 0 }}>Guards</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Security escorts assigned to trips that trip a corporate&rsquo;s safety policy (e.g. a mandatory-guard rule
        for late-hour drops). Once onboarded here, a guard can set up their own mobile login in the guard app using
        this Guard ID and their phone number.
      </p>

      <div className="card">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, flex: "1 1 160px" }}>
            <label>Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: "1 1 140px" }}>
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+91..." />
          </div>
          <button type="submit" disabled={busy}>
            Add guard
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Guard ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {guards.map((g) => (
              <tr key={g.id}>
                <td>{g.globalGuardId}</td>
                <td>{g.fullName}</td>
                <td>{g.phone}</td>
                <td>
                  <span className="badge">{g.status}</span>
                </td>
              </tr>
            ))}
            {guards.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  No guards yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
