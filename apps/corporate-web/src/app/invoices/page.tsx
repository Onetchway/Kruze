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

  function vendorNameById(id: string): string {
    const rel = vendors.find((r) => otherOrgId(r, session!.organisationId) === id);
    return rel ? vendorName(rel, session!.organisationId) : id;
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

  return (
    <ProtectedShell
      title="Invoices"
      subtitle="Invoice periods per vendor. Line-level claimed-vs-validated drill-down lives on Reconciliation."
    >
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

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Period</th>
              <th>Status</th>
              <th>Lines</th>
              <th>Variance lines</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const varianceCount = inv.lines.filter((l) => l.status === "VARIANCE").length;
              return (
                <tr key={inv.id}>
                  <td>{vendorNameById(inv.vendorOrgId)}</td>
                  <td>
                    {inv.periodStart.slice(0, 10)} → {inv.periodEnd.slice(0, 10)}
                  </td>
                  <td>
                    <span className="badge">{inv.status}</span>
                  </td>
                  <td>{inv.lines.length}</td>
                  <td className={varianceCount > 0 ? "warning" : undefined}>{varianceCount}</td>
                  <td>
                    <a href="/reconciliation">Review lines →</a>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No invoices yet — create one for a connected vendor above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
