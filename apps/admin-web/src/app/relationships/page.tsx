"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, PlatformRelationshipRow, PlatformRelationshipSummary } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const TYPES = ["", "KRUZE_TENANCY", "OPERATOR_MANAGES_CORPORATE", "CORPORATE_VENDOR", "VENDOR_SUB_VENDOR"];
const STATUSES = ["", "INVITED", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "TERMINATED", "REJECTED"];

function statusClass(status: string) {
  if (status === "ACTIVE") return " success";
  if (status === "TERMINATED" || status === "REJECTED") return " danger";
  if (status === "INVITED" || status === "PENDING_APPROVAL" || status === "SUSPENDED") return " warning";
  return "";
}

export default function RelationshipsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<PlatformRelationshipRow[]>([]);
  const [summary, setSummary] = useState<PlatformRelationshipSummary | null>(null);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api
      .listPlatformRelationships(session.accessToken, { type: type || undefined, status: status || undefined })
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load relationships"));
    api.getPlatformRelationshipsSummary(session.accessToken).then(setSummary).catch(() => {});
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [session, type, status]);

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Relationships</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Every Corporate ↔ Vendor / Fleet-Operator relationship platform-wide, with its contract reference, service
        dates, and status (spec §18).
      </p>

      {summary && (
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{summary.total}</div>
            <div className="label">Total relationships</div>
          </div>
          <div className="stat-tile">
            <div className="value">{summary.byStatus["ACTIVE"] ?? 0}</div>
            <div className="label">Active</div>
          </div>
          <div className={`stat-tile${(summary.byStatus["INVITED"] ?? 0) + (summary.byStatus["PENDING_APPROVAL"] ?? 0) > 0 ? " warning" : ""}`}>
            <div className="value">{(summary.byStatus["INVITED"] ?? 0) + (summary.byStatus["PENDING_APPROVAL"] ?? 0)}</div>
            <div className="label">Pending / invited</div>
          </div>
          <div className="stat-tile">
            <div className="value">{summary.byType["CORPORATE_VENDOR"] ?? 0}</div>
            <div className="label">Corporate ↔ Vendor</div>
          </div>
          <div className="stat-tile">
            <div className="value">{summary.byType["OPERATOR_MANAGES_CORPORATE"] ?? 0}</div>
            <div className="label">Operator ↔ Corporate</div>
          </div>
        </div>
      )}

      <div className="card" style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t || "All types"}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {error && <p className="error-text">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Corporate</th>
              <th>Vendor / Fleet Operator</th>
              <th>Type</th>
              <th>Status</th>
              <th>Contract ref</th>
              <th>Service dates</th>
              <th>Service areas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const corporateFirst = r.sourceOrg.roles.includes("CORPORATE");
              const corporate = corporateFirst ? r.sourceOrg : r.targetOrg;
              const vendor = corporateFirst ? r.targetOrg : r.sourceOrg;
              return (
                <tr key={r.id}>
                  <td>
                    <a href={`/organisations/${corporate.id}`}>{corporate.displayName}</a>
                  </td>
                  <td>
                    <a href={`/organisations/${vendor.id}`}>{vendor.displayName}</a>
                  </td>
                  <td>{r.type}</td>
                  <td>
                    <span className={`badge${statusClass(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="mono">{r.contract ? r.contract.id.slice(0, 8) : "—"}</td>
                  <td>
                    {r.startsAt ? new Date(r.startsAt).toLocaleDateString() : "—"}
                    {" – "}
                    {r.endsAt ? new Date(r.endsAt).toLocaleDateString() : "open"}
                  </td>
                  <td>{r.contract?.scopeCities?.length ? r.contract.scopeCities.join(", ") : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  No relationships match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
