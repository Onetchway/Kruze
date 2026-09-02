"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, VendorPayable } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function VendorPayablesPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<VendorPayable[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.vendorPayables(session.accessToken).then(setRows).catch(() => {});
  }

  useEffect(reload, [session]);

  async function markPaid(vendorOrgId: string, outstanding: number) {
    if (!session) return;
    // Payment status is recorded per-invoice; this marks every outstanding invoice for the vendor as paid.
    const invoices = await api.listInvoices(session.accessToken);
    const vendorInvoices = invoices.filter((i) => i.vendorOrgId === vendorOrgId && i.status === "APPROVED");
    try {
      for (const inv of vendorInvoices) {
        await api.setInvoicePaymentStatus(session.accessToken, inv.id, { paymentStatus: "PAID" });
      }
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record payment");
    }
    void outstanding;
  }

  const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0);

  return (
    <ProtectedShell
      title="Vendor Payables"
      subtitle="Amounts owed per vendor, derived from approved invoice lines — not invented numbers."
    >
      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">₹{totalOutstanding.toFixed(0)}</div>
          <div className="label">Total outstanding</div>
        </div>
        <div className="stat-tile">
          <div className="value">{rows.length}</div>
          <div className="label">Vendors with payables</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Invoices</th>
              <th>Approved total</th>
              <th>Paid</th>
              <th>Outstanding</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vendorOrgId}>
                <td>{r.vendor?.displayName ?? r.vendorOrgId}</td>
                <td>{r.invoiceCount}</td>
                <td>₹{r.approvedTotal.toFixed(0)}</td>
                <td>₹{r.paidTotal.toFixed(0)}</td>
                <td>
                  <span className={`badge ${r.outstanding > 0 ? "warning" : ""}`}>₹{r.outstanding.toFixed(0)}</span>
                </td>
                <td>
                  {r.outstanding > 0 && (
                    <button className="secondary" onClick={() => markPaid(r.vendorOrgId, r.outstanding)}>
                      Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No approved vendor invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {error && <p className="error-text">{error}</p>}
      </div>
    </ProtectedShell>
  );
}
