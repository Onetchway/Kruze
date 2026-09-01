"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Driver, DriverPaymentVoucher } from "@/lib/api";
import { Shell } from "@/components/Shell";

function firstOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function OperationalMisPage() {
  const { session } = useAuth();
  const [vouchers, setVouchers] = useState<DriverPaymentVoucher[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [periodStart, setPeriodStart] = useState(firstOfMonthIso());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listDriverPaymentVouchers(session.accessToken).then(setVouchers).catch(() => {});
    api.listDrivers(session.accessToken).then((list) => {
      setDrivers(list);
      if (list.length > 0) setDriverId((prev) => prev || list[0].id);
    }).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !driverId) return;
    setBusy(true);
    setError(null);
    try {
      await api.generateDriverPaymentVoucher(session.accessToken, { driverId, periodStart, periodEnd });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate voucher");
    } finally {
      setBusy(false);
    }
  }

  async function handleLock(id: string) {
    if (!session) return;
    setError(null);
    try {
      await api.lockDriverPaymentVoucher(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to lock voucher");
    }
  }

  const totalNet = vouchers.reduce((sum, v) => sum + Number(v.netPayment), 0);

  return (
    <Shell>
      <h2 style={{ marginTop: 0 }}>Operational MIS</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Generate driver payment vouchers for a period from your completed trips&rsquo; billed amounts.
      </p>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{vouchers.length}</div>
          <div className="label">Total vouchers</div>
        </div>
        <div className="stat-tile">
          <div className="value">{vouchers.filter((v) => v.status === "DRAFT").length}</div>
          <div className="label">Draft</div>
        </div>
        <div className="stat-tile">
          <div className="value">{vouchers.filter((v) => v.status === "LOCKED").length}</div>
          <div className="label">Locked</div>
        </div>
        <div className="stat-tile">
          <div className="value">₹{totalNet.toFixed(2)}</div>
          <div className="label">Total net payment</div>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleGenerate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
            <label>Driver</label>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Period start</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Period end</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </div>
          <button type="submit" disabled={busy || !driverId}>
            Generate New MIS
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
        {drivers.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Add a driver first.</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Period</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net payment</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id}>
                <td>{v.driver.fullName}</td>
                <td>
                  {new Date(v.periodStart).toLocaleDateString()} – {new Date(v.periodEnd).toLocaleDateString()}
                </td>
                <td>₹{Number(v.grossAmount).toFixed(2)}</td>
                <td>₹{Number(v.deductions).toFixed(2)}</td>
                <td>₹{Number(v.netPayment).toFixed(2)}</td>
                <td>
                  <span className="badge">{v.status}</span>
                </td>
                <td>{v.status === "DRAFT" && <button onClick={() => handleLock(v.id)}>Lock</button>}</td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  No payment vouchers found — generate a new MIS to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
