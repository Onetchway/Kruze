"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Invoice, OrganisationRelationship } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function InvoicesPage() {
  const { session } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<OrganisationRelationship[]>([]);
  const [vendorOrgId, setVendorOrgId] = useState("");
  const [periodStart, setPeriodStart] = useState(firstOfMonthIso());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listInvoices(session.accessToken).then(setInvoices).catch(() => {});
    api.listRelationships(session.accessToken).then((rels) => {
      const active = rels.filter((r) => r.type === "CORPORATE_VENDOR" && r.status === "ACTIVE");
      setVendors(active);
      setVendorOrgId((prev) => prev || (active[0] ? otherOrgId(active[0], session.organisationId) : ""));
    }).catch(() => {});
  }

  useEffect(reload, [session]);

  function otherOrgId(rel: OrganisationRelationship, myOrgId: string): string {
    return rel.sourceOrgId === myOrgId ? rel.targetOrgId : rel.sourceOrgId;
  }

  function vendorName(rel: OrganisationRelationship, myOrgId: string): string {
    const org = rel.sourceOrgId === myOrgId ? rel.targetOrg : rel.sourceOrg;
    return org?.displayName ?? otherOrgId(rel, myOrgId);
  }

  async function handleCreate() {
    if (!session || !vendorOrgId) return;
    setBusy(true);
    setError(null);
    try {
      await api.createInvoice(session.accessToken, { vendorOrgId, periodStart, periodEnd });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create invoice");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveLine(lineId: string) {
    if (!session) return;
    try {
      await api.approveInvoiceLine(session.accessToken, lineId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve line");
    }
  }

  async function handleDisputeLine(lineId: string) {
    if (!session) return;
    const reason = window.prompt("Reason for disputing this line?");
    if (!reason) return;
    try {
      await api.disputeInvoiceLine(session.accessToken, lineId, reason);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to dispute line");
    }
  }

  const allLines = invoices.flatMap((inv) => inv.lines);
  const varianceLines = allLines.filter((l) => l.status === "VARIANCE");
  const totalClaimed = allLines.reduce((sum, l) => sum + Number(l.claimedAmount), 0);
  const totalApproved = allLines.reduce((sum, l) => sum + Number(l.approvedAmount ?? 0), 0);

  return (
    <ProtectedShell
      title="Invoice Reconciliation"
      subtitle="Vendor-claimed amounts vs. Kruze-validated trip charges — every line is checked against GPS/OTP-backed trip data, never taken on trust."
    >
      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">₹{totalClaimed.toFixed(2)}</div>
          <div className="label">Total claimed</div>
        </div>
        <div className="stat-tile">
          <div className="value">₹{totalApproved.toFixed(2)}</div>
          <div className="label">Total Kruze-validated</div>
        </div>
        <div className={`stat-tile ${varianceLines.length > 0 ? "warning" : ""}`}>
          <div className="value">{varianceLines.length}</div>
          <div className="label">Lines with variance</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create invoice period</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>Vendor</label>
            <select value={vendorOrgId} onChange={(e) => setVendorOrgId(e.target.value)}>
              {vendors.length === 0 && <option value="">No connected vendors yet</option>}
              {vendors.map((r) => (
                <option key={r.id} value={otherOrgId(r, session!.organisationId)}>
                  {vendorName(r, session!.organisationId)}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Period start</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Period end</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <button onClick={handleCreate} disabled={busy || !vendorOrgId}>
            Create invoice
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>

      {invoices.map((inv) => (
        <div className="card" key={inv.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>
              {inv.periodStart.slice(0, 10)} → {inv.periodEnd.slice(0, 10)}
            </strong>
            <span className="badge">{inv.status}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Trip</th>
                <th>Vendor claimed</th>
                <th>Kruze-validated</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.tripId}</td>
                  <td>₹{Number(l.claimedAmount).toFixed(2)}</td>
                  <td>{l.approvedAmount != null ? `₹${Number(l.approvedAmount).toFixed(2)}` : "—"}</td>
                  <td className={l.status === "VARIANCE" ? "warning" : undefined} style={l.status === "VARIANCE" ? { color: "var(--warning)" } : undefined}>
                    {l.varianceAmount != null ? `₹${Number(l.varianceAmount).toFixed(2)}` : "—"}
                  </td>
                  <td>
                    <span className="badge">{l.status}</span>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {l.status !== "APPROVED" && l.status !== "DISPUTED" && (
                      <>
                        <button onClick={() => handleApproveLine(l.id)}>Approve</button>
                        <button className="secondary" onClick={() => handleDisputeLine(l.id)}>
                          Dispute
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {inv.lines.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                    No lines yet — the vendor adds claimed trip charges to this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
      {invoices.length === 0 && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          No invoices yet — create one for a connected vendor above.
        </div>
      )}
    </ProtectedShell>
  );
}
