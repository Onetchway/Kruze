"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Invoice, InvoiceLine, OrganisationRelationship } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const STATUS_FILTERS = ["ALL", "PENDING", "MATCHED", "VARIANCE", "DISPUTED", "APPROVED"];

export default function ReconciliationPage() {
  const { session } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<OrganisationRelationship[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listInvoices(session.accessToken).then(setInvoices).catch(() => {});
    api.listRelationships(session.accessToken).then((rels) => setVendors(rels.filter((r) => r.type === "CORPORATE_VENDOR"))).catch(() => {});
  }

  useEffect(reload, [session]);

  function otherOrgId(rel: OrganisationRelationship): string {
    return rel.sourceOrgId === session!.organisationId ? rel.targetOrgId : rel.sourceOrgId;
  }

  function vendorNameForInvoice(inv: Invoice): string {
    const rel = vendors.find((r) => otherOrgId(r) === inv.vendorOrgId);
    if (!rel) return inv.vendorOrgId;
    const org = rel.sourceOrgId === session!.organisationId ? rel.targetOrg : rel.sourceOrg;
    return org?.displayName ?? inv.vendorOrgId;
  }

  async function handleApprove(lineId: string) {
    if (!session) return;
    try {
      await api.approveInvoiceLine(session.accessToken, lineId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve line");
    }
  }

  async function handleDispute(lineId: string) {
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

  const rows: { invoice: Invoice; line: InvoiceLine }[] = invoices.flatMap((inv) => inv.lines.map((line) => ({ invoice: inv, line })));
  const visible = filter === "ALL" ? rows : rows.filter((r) => r.line.status === filter);

  const totalClaimed = rows.reduce((sum, r) => sum + Number(r.line.claimedAmount), 0);
  const totalValidated = rows.reduce((sum, r) => sum + Number(r.line.approvedAmount ?? 0), 0);
  const totalVarianceAmount = rows
    .filter((r) => r.line.status === "VARIANCE")
    .reduce((sum, r) => sum + Math.abs(Number(r.line.varianceAmount ?? 0)), 0);

  return (
    <ProtectedShell
      title="Reconciliation"
      subtitle="Every invoice line, across every vendor and period — claimed vs. Kruze-validated, with the variance called out."
    >
      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">₹{totalClaimed.toFixed(2)}</div>
          <div className="label">Vendor claimed</div>
        </div>
        <div className="stat-tile">
          <div className="value">₹{totalValidated.toFixed(2)}</div>
          <div className="label">Kruze validated</div>
        </div>
        <div className={`stat-tile ${totalVarianceAmount > 0 ? "warning" : ""}`}>
          <div className="value">₹{totalVarianceAmount.toFixed(2)}</div>
          <div className="label">Total variance</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s} className={filter === s ? "" : "secondary"} onClick={() => setFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Period</th>
              <th>Trip</th>
              <th>Claimed</th>
              <th>Validated</th>
              <th>Variance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ invoice, line }) => (
              <tr key={line.id}>
                <td>{vendorNameForInvoice(invoice)}</td>
                <td>
                  {invoice.periodStart.slice(0, 10)} → {invoice.periodEnd.slice(0, 10)}
                </td>
                <td>{line.tripId}</td>
                <td>₹{Number(line.claimedAmount).toFixed(2)}</td>
                <td>{line.approvedAmount != null ? `₹${Number(line.approvedAmount).toFixed(2)}` : "—"}</td>
                <td
                  className={line.status === "VARIANCE" ? "warning" : undefined}
                  style={line.status === "VARIANCE" ? { color: "var(--warning)" } : undefined}
                >
                  {line.varianceAmount != null ? `₹${Number(line.varianceAmount).toFixed(2)}` : "—"}
                </td>
                <td>
                  <span className="badge">{line.status}</span>
                </td>
                <td style={{ display: "flex", gap: 6 }}>
                  {line.status !== "APPROVED" && line.status !== "DISPUTED" && (
                    <>
                      <button onClick={() => handleApprove(line.id)}>Approve</button>
                      <button className="secondary" onClick={() => handleDispute(line.id)}>
                        Dispute
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  No lines in this filter.
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
