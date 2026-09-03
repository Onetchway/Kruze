"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, PlatformDashboardOverview, SubscriptionPlan } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function ReportsPage() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState<PlatformDashboardOverview | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    if (!session) return;
    api.getDashboard(session.accessToken).then(setDashboard).catch(() => {});
    api.listPlans(session.accessToken).then(setPlans).catch(() => {});
  }, [session]);

  if (!dashboard) {
    return (
      <ProtectedShell>
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      </ProtectedShell>
    );
  }

  const totalOrgs = dashboard.organisations.total || 1;
  const completionDenominator = dashboard.platformUsage.tripsTotal || 1;
  // Trips completed isn't a separate dashboard field — approximated as
  // all-time trips minus what's currently open (running/exceptions), so
  // this is a coarse estimate, labelled as such below rather than an
  // exact "completed" count from a dedicated field.
  const roughOpenTrips = dashboard.platformUsage.tripsRunningNow + dashboard.platformUsage.openExceptions;
  const roughCompletionRate = Math.max(0, Math.min(100, Math.round(((completionDenominator - roughOpenTrips) / completionDenominator) * 100)));

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Reports & Analytics</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        A few extra summary views computed from the same aggregates as the Dashboard, Audit Log and Security Centre —
        no new data pipeline. For per-trip completion detail see{" "}
        <a href="/operations">Transport Operations →</a>; for full audit history see <a href="/audit-log">Audit Logs →</a>.
      </p>

      <div className="kpi-group">
        <h3>Organisation mix</h3>
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{Math.round((dashboard.organisations.corporate / totalOrgs) * 100)}%</div>
            <div className="label">Corporate share</div>
          </div>
          <div className="stat-tile">
            <div className="value">{Math.round((dashboard.organisations.vendor / totalOrgs) * 100)}%</div>
            <div className="label">Vendor share</div>
          </div>
          <div className="stat-tile">
            <div className="value">{Math.round((dashboard.organisations.operator / totalOrgs) * 100)}%</div>
            <div className="label">Fleet operator share</div>
          </div>
        </div>
      </div>

      <div className="kpi-group">
        <h3>Plan distribution</h3>
        <div className="stat-row">
          {plans.map((p) => (
            <div key={p.id} className="stat-tile">
              <div className="value">{p.active ? "Active" : "Inactive"}</div>
              <div className="label">{p.name}</div>
            </div>
          ))}
          {plans.length === 0 && <p style={{ color: "var(--text-muted)" }}>No plans defined.</p>}
        </div>
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{dashboard.subscription.byStatus["ACTIVE"] ?? 0}</div>
            <div className="label">Active subscriptions</div>
          </div>
          <div className="stat-tile">
            <div className="value">{dashboard.subscription.byStatus["TRIAL"] ?? 0}</div>
            <div className="label">Trial subscriptions</div>
          </div>
          <div className="stat-tile">
            <div className="value">${dashboard.subscription.mrr.toLocaleString()}</div>
            <div className="label">MRR</div>
          </div>
        </div>
      </div>

      <div className="kpi-group">
        <h3>Trip throughput (approximate)</h3>
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{dashboard.platformUsage.tripsTotal}</div>
            <div className="label">Trips all-time</div>
          </div>
          <div className="stat-tile">
            <div className="value">{roughCompletionRate}%</div>
            <div className="label">Estimated completion rate</div>
          </div>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
          Estimated as (all-time trips − currently running − open exceptions) / all-time trips — a coarse proxy, not a
          dedicated &quot;completed&quot; metric. See Transport Operations for exact status counts.
        </p>
      </div>

      <div className="kpi-group">
        <h3>Security & audit signal (7d)</h3>
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{dashboard.security.auditEventsLast24h}</div>
            <div className="label">Audit events (24h)</div>
          </div>
          <div className={`stat-tile${dashboard.security.failedLoginsLast24h > 0 ? " warning" : ""}`}>
            <div className="value">{dashboard.security.failedLoginsLast24h}</div>
            <div className="label">Failed logins (24h)</div>
          </div>
        </div>
      </div>
    </ProtectedShell>
  );
}
