"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Guard } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const FLEET_ROLES = ["VENDOR_ADMIN", "FLEET_OPERATOR_ADMIN"];
const CORPORATE_ROLES = ["CORPORATE_TRANSPORT_ADMIN", "CORPORATE_HR"];

function VendorGuardsContent() {
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
    <>
      <h2 style={{ marginTop: 0 }}>Guards</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Guards you can assign as escorts on trips that require one — e.g. under a corporate&apos;s Female Safety policy.
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
    </>
  );
}

function CorporateGuardsNetwork() {
  const { session } = useAuth();
  const [guards, setGuards] = useState<Guard[]>([]);

  useEffect(() => {
    if (!session) return;
    api.listGuardsNetwork(session.accessToken).then(setGuards).catch(() => {});
  }, [session]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Guards</h2>
      <p style={{ color: "var(--text-muted)" }}>Guards authorized for your operations via your connected vendors.</p>
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
                  No guards from your connected vendors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function GuardsPage() {
  const { session } = useAuth();

  return (
    <ProtectedShell>
      {session && FLEET_ROLES.includes(session.role) ? (
        <VendorGuardsContent />
      ) : session && CORPORATE_ROLES.includes(session.role) ? (
        <CorporateGuardsNetwork />
      ) : (
        <div className="card">
          <p style={{ margin: 0 }}>Guard visibility is available for Corporate, Fleet Operator, and Vendor accounts.</p>
        </div>
      )}
    </ProtectedShell>
  );
}
