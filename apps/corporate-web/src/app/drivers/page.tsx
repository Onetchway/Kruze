"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Driver } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const FLEET_ROLES = ["VENDOR_ADMIN", "FLEET_OPERATOR_ADMIN"];

function DriversContent() {
  const { session } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listDrivers(session.accessToken).then(setDrivers).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createDriver(session.accessToken, { fullName, phone, licenceNumber: licenceNumber || undefined });
      setFullName("");
      setPhone("");
      setLicenceNumber("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add driver");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Drivers</h2>
      <p style={{ color: "var(--text-muted)" }}>
        A driver has one global identity across every vendor they work with — compliance documents and eligibility
        gate every assignment automatically.
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
          <div className="field" style={{ marginBottom: 0, flex: "1 1 140px" }}>
            <label>Licence number</label>
            <input value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} />
          </div>
          <button type="submit" disabled={busy}>
            Add driver
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Licence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id}>
                <td>{d.globalDriverId}</td>
                <td>{d.fullName}</td>
                <td>{d.phone}</td>
                <td>{d.licenceNumber ?? "—"}</td>
                <td>
                  <span className="badge">{d.status}</span>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No drivers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function DriversPage() {
  const { session } = useAuth();

  return (
    <ProtectedShell>
      {session && !FLEET_ROLES.includes(session.role) ? (
        <div className="card">
          <p style={{ margin: 0 }}>
            Driver management is available for Fleet Operator and Vendor accounts.
          </p>
        </div>
      ) : (
        <DriversContent />
      )}
    </ProtectedShell>
  );
}
