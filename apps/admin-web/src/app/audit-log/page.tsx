"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, AuditLogEntry, Organisation } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function AuditLogPage() {
  const { session } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [organisationId, setOrganisationId] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api.listOrganisations(session.accessToken).then(setOrganisations).catch(() => {});
  }, [session]);

  function search(cursor?: string) {
    if (!session) return;
    setError(null);
    api
      .getAuditLog(session.accessToken, {
        organisationId: organisationId || undefined,
        action: action || undefined,
        resourceType: resourceType || undefined,
        from: from || undefined,
        to: to || undefined,
        cursor,
      })
      .then((res) => {
        setEntries((prev) => (cursor ? [...prev, ...res.entries] : res.entries));
        setNextCursor(res.nextCursor);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load audit log"));
  }

  useEffect(() => search(), [session]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Platform Audit Log</h2>
      <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
        Every mutation flowing through AuditInterceptor / AuditService, with actor, action, resource, before/after
        state, and correlation ID.
      </p>

      <div className="card">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
            <label>Organisation</label>
            <select value={organisationId} onChange={(e) => setOrganisationId(e.target.value)}>
              <option value="">All</option>
              {organisations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
            <label>Action contains</label>
            <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="SUSPENDED" />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Resource type</label>
            <input value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder="Organisation" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button onClick={() => search()}>Filter</button>
          </div>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Organisation</th>
              <th>Action</th>
              <th>Resource</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <React.Fragment key={e.id}>
                <tr>
                  <td>{new Date(e.createdAt).toLocaleString()}</td>
                  <td>{e.actor?.displayName ?? e.actor?.email ?? "system"}</td>
                  <td>{e.organisation?.displayName ?? "—"}</td>
                  <td className="mono">{e.action}</td>
                  <td>
                    {e.resourceType}
                    {e.resourceId ? <span className="mono" style={{ color: "var(--text-muted)" }}> #{e.resourceId.slice(0, 8)}</span> : null}
                  </td>
                  <td>
                    <button className="secondary" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                      {expanded === e.id ? "Hide" : "Details"}
                    </button>
                  </td>
                </tr>
                {expanded === e.id && (
                  <tr>
                    <td colSpan={6}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <strong>Before</strong>
                          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "var(--bg)", padding: 8, borderRadius: 6 }}>
                            {JSON.stringify(e.beforeValue ?? null, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <strong>After</strong>
                          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "var(--bg)", padding: 8, borderRadius: 6 }}>
                            {JSON.stringify(e.afterValue ?? null, null, 2)}
                          </pre>
                        </div>
                      </div>
                      <p className="mono" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        correlationId: {e.correlationId ?? "—"} · ip: {e.ipAddress ?? "—"} · reason: {e.reason ?? "—"}
                      </p>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No audit entries match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {nextCursor && (
          <div style={{ marginTop: 12 }}>
            <button className="secondary" onClick={() => search(nextCursor)}>
              Load more
            </button>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
