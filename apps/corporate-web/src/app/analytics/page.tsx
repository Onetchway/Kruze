"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, CorporateAnalytics, VendorAnalytics, ComplianceSummaryRow, OrganisationRelationship } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function pct(v: number | null): string {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

export default function AnalyticsPage() {
  const { session } = useAuth();
  const [corp, setCorp] = useState<CorporateAnalytics | null>(null);
  const [vendors, setVendors] = useState<OrganisationRelationship[]>([]);
  const [selectedVendorOrgId, setSelectedVendorOrgId] = useState("");
  const [vendorPerf, setVendorPerf] = useState<VendorAnalytics | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummaryRow[]>([]);

  useEffect(() => {
    if (!session) return;
    api.corporateAnalytics(session.accessToken).then(setCorp).catch(() => {});
    api.complianceSummary(session.accessToken).then(setCompliance).catch(() => {});
    api.listRelationships(session.accessToken).then((rels) => {
      const active = rels.filter((r) => r.type === "CORPORATE_VENDOR" && r.status === "ACTIVE");
      setVendors(active);
      if (active[0]) {
        const orgId = active[0].sourceOrgId === session.organisationId ? active[0].targetOrgId : active[0].sourceOrgId;
        setSelectedVendorOrgId((prev) => prev || orgId);
      }
    }).catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session || !selectedVendorOrgId) return;
    api.vendorAnalytics(session.accessToken, selectedVendorOrgId).then(setVendorPerf).catch(() => setVendorPerf(null));
  }, [session, selectedVendorOrgId]);

  function otherOrgId(rel: OrganisationRelationship): string {
    return rel.sourceOrgId === session!.organisationId ? rel.targetOrgId : rel.sourceOrgId;
  }
  function vendorName(rel: OrganisationRelationship): string {
    const org = rel.sourceOrgId === session!.organisationId ? rel.targetOrg : rel.sourceOrg;
    return org?.displayName ?? otherOrgId(rel);
  }

  const compliantCount = compliance.filter((c) => c.status === "PASS" || c.status === "COMPLIANT").reduce((s, c) => s + c.count, 0);
  const totalComplianceEvals = compliance.reduce((s, c) => s + c.count, 0);

  return (
    <ProtectedShell title="Analytics" subtitle="Transport, vendor, and compliance metrics over the last 30 days.">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Transport</h3>
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{corp?.totalTrips ?? "—"}</div>
            <div className="label">Total trips</div>
          </div>
          <div className="stat-tile">
            <div className="value">{pct(corp?.onTimePerformance ?? null)}</div>
            <div className="label">On-time performance</div>
          </div>
          <div className={`stat-tile ${(corp?.noShowRate ?? 0) > 0.05 ? "warning" : ""}`}>
            <div className="value">{pct(corp?.noShowRate ?? null)}</div>
            <div className="label">No-show rate</div>
          </div>
          <div className="stat-tile">
            <div className="value">₹{(corp?.costPerEmployee ?? 0).toFixed(0)}</div>
            <div className="label">Cost per employee</div>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">₹{(corp?.totalCorporateCost ?? 0).toFixed(0)}</div>
            <div className="label">Total corporate cost</div>
          </div>
          <div className="stat-tile">
            <div className="value">₹{(corp?.totalVendorPayable ?? 0).toFixed(0)}</div>
            <div className="label">Total vendor payable</div>
          </div>
        </div>
        {corp && Object.keys(corp.tripsByStatus).length > 0 && (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(corp.tripsByStatus).map(([status, count]) => (
                <tr key={status}>
                  <td>{status.replaceAll("_", " ")}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ marginTop: 0 }}>Vendor performance</h3>
          {vendors.length > 0 && (
            <select value={selectedVendorOrgId} onChange={(e) => setSelectedVendorOrgId(e.target.value)} style={{ width: "auto" }}>
              {vendors.map((r) => (
                <option key={r.id} value={otherOrgId(r)}>
                  {vendorName(r)}
                </option>
              ))}
            </select>
          )}
        </div>
        {vendors.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No connected vendors yet.</p>
        ) : (
          <div className="stat-row">
            <div className="stat-tile">
              <div className="value">{vendorPerf?.totalTrips ?? "—"}</div>
              <div className="label">Trips</div>
            </div>
            <div className="stat-tile">
              <div className="value">{pct(vendorPerf?.completionRate ?? null)}</div>
              <div className="label">Completion rate</div>
            </div>
            <div className={`stat-tile ${(vendorPerf?.cancellationRate ?? 0) > 0.1 ? "warning" : ""}`}>
              <div className="value">{pct(vendorPerf?.cancellationRate ?? null)}</div>
              <div className="label">Cancellation rate</div>
            </div>
            <div className={`stat-tile ${(vendorPerf?.incidentCount ?? 0) > 0 ? "warning" : ""}`}>
              <div className="value">{vendorPerf?.incidentCount ?? "—"}</div>
              <div className="label">Incidents</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Compliance</h3>
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{totalComplianceEvals > 0 ? `${((compliantCount / totalComplianceEvals) * 100).toFixed(0)}%` : "—"}</div>
            <div className="label">Overall compliance</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {compliance.map((c, i) => (
              <tr key={i}>
                <td>{c.subjectType}</td>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
                <td>{c.count}</td>
              </tr>
            ))}
            {compliance.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  No compliance evaluations recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
