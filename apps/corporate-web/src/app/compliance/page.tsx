"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ComplianceRule, ComplianceSummaryRow } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const SUBJECT_TYPES = ["DRIVER", "VEHICLE", "GUARD", "VENDOR"];
const SCOPES = ["GLOBAL", "VENDOR", "CORPORATE", "TRIP"];
const STATUS_BUCKETS = [
  { status: "COMPLIANT", label: "Compliant" },
  { status: "EXPIRING", label: "Expiring Soon" },
  { status: "NON_COMPLIANT", label: "Expired / Non-compliant" },
  { status: "UNDER_REVIEW", label: "Under Review" },
  { status: "SUSPENDED", label: "Blocked" },
];

export default function CompliancePage() {
  const { session } = useAuth();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [evaluations, setEvaluations] = useState<ComplianceSummaryRow[]>([]);
  const [scope, setScope] = useState("CORPORATE");
  const [subjectType, setSubjectType] = useState("DRIVER");
  const [docType, setDocType] = useState("");
  const [graceDays, setGraceDays] = useState(0);
  const [severity, setSeverity] = useState("BLOCKING");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listComplianceRules(session.accessToken).then(setRules).catch(() => {});
    api.complianceSummary(session.accessToken).then(setEvaluations).catch(() => {});
  }

  useEffect(reload, [session]);

  const byType = SUBJECT_TYPES.map((t) => ({ type: t, rules: rules.filter((r) => r.subjectType === t) }));
  const bucketCounts = STATUS_BUCKETS.map((b) => ({
    ...b,
    count: evaluations.filter((e) => e.status === b.status).reduce((sum, e) => sum + e.count, 0),
  }));

  async function handleCreate() {
    if (!session || !docType) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.createComplianceRule(session.accessToken, {
        scope,
        scopeOrgId: scope === "CORPORATE" ? session.organisationId : undefined,
        subjectType,
        docType,
        maxExpiryGraceDays: graceDays,
        severity,
      });
      setDocType("");
      setMessage("Compliance rule added.");
      reload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.message} (creating rules requires the Compliance Manager or Transport Admin role)`
          : "Failed to create rule",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedShell
      title="Compliance"
      subtitle="Required-document policy per resource type — feeds the allocation engine's eligibility checks."
    >
      <div className="stat-row">
        {bucketCounts.map((b) => (
          <div key={b.status} className={`stat-tile ${b.status === "NON_COMPLIANT" || b.status === "SUSPENDED" ? (b.count > 0 ? "warning" : "") : ""}`}>
            <div className="value">{b.count}</div>
            <div className="label">{b.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Required documents by resource type</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {byType.map(({ type, rules: r }) => (
            <div key={type}>
              <strong>{type}</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                {r.length === 0 && <li style={{ color: "var(--text-muted)" }}>No documents required yet</li>}
                {r.map((rule) => (
                  <li key={rule.id}>
                    ✓ {rule.docType}
                    {rule.severity === "WARNING" && <span style={{ color: "var(--text-muted)" }}> (advisory)</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add a required-document rule</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Scope</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Applies to</label>
            <select value={subjectType} onChange={(e) => setSubjectType(e.target.value)}>
              {SUBJECT_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
            <label>Document type</label>
            <input value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="e.g. DRIVING_LICENCE" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Grace days</label>
            <input type="number" value={graceDays} onChange={(e) => setGraceDays(Number(e.target.value))} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="BLOCKING">Blocking</option>
              <option value="WARNING">Warning</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={busy || !docType}>
            Add rule
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
        {message && <p style={{ color: "var(--success)", fontSize: 13, marginTop: 8 }}>{message}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>All rules</h3>
        <table>
          <thead>
            <tr>
              <th>Applies to</th>
              <th>Document</th>
              <th>Scope</th>
              <th>Grace (days)</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>{r.subjectType}</td>
                <td>{r.docType}</td>
                <td>{r.scope}</td>
                <td>{r.maxExpiryGraceDays}</td>
                <td>
                  <span className="badge">{r.severity}</span>
                </td>
                <td>
                  <span className="badge">{r.active ? "Active" : "Inactive"}</span>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No compliance rules configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
