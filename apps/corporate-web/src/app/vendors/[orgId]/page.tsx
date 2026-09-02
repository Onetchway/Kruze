"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, VendorAnalytics, ComplianceSummaryRow } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function pct(v: number | null): string {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

export default function VendorProfilePage() {
  const { session } = useAuth();
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const [perf, setPerf] = useState<VendorAnalytics | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !params.orgId) return;
    api.vendorAnalytics(session.accessToken, params.orgId).then(setPerf).catch((err) => setError(err?.message ?? "Failed to load vendor performance"));
    api.complianceSummary(session.accessToken, params.orgId).then(setCompliance).catch(() => {});
  }, [session, params.orgId]);

  const compliant = compliance.filter((c) => c.status === "PASS" || c.status === "COMPLIANT").reduce((s, c) => s + c.count, 0);
  const totalEvals = compliance.reduce((s, c) => s + c.count, 0);

  return (
    <ProtectedShell>
      <button className="secondary" onClick={() => router.push("/connections")} style={{ marginBottom: 16 }}>
        ← Back to Vendors
      </button>
      <h2 style={{ marginTop: 0 }}>Vendor performance</h2>
      {error && <p className="error-text">{error}</p>}

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{perf?.totalTrips ?? "—"}</div>
          <div className="label">Trips (last 30 days)</div>
        </div>
        <div className="stat-tile">
          <div className="value">{pct(perf?.completionRate ?? null)}</div>
          <div className="label">Completion rate</div>
        </div>
        <div className={`stat-tile ${(perf?.cancellationRate ?? 0) > 0.1 ? "warning" : ""}`}>
          <div className="value">{pct(perf?.cancellationRate ?? null)}</div>
          <div className="label">Cancellation rate</div>
        </div>
        <div className={`stat-tile ${(perf?.incidentCount ?? 0) > 0 ? "warning" : ""}`}>
          <div className="value">{perf?.incidentCount ?? 0}</div>
          <div className="label">Incidents</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Compliance</h3>
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{totalEvals > 0 ? `${((compliant / totalEvals) * 100).toFixed(0)}%` : "—"}</div>
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
                  No compliance rules scoped to this vendor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
