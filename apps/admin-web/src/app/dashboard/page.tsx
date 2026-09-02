"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, PlatformDashboardOverview } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

function Tile({ value, label, warning }: { value: string | number; label: string; warning?: boolean }) {
  return (
    <div className={`stat-tile${warning ? " warning" : ""}`}>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const [data, setData] = useState<PlatformDashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api
      .getDashboard(session.accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, [session]);

  if (error) {
    return (
      <ProtectedShell>
        <p className="error-text">{error}</p>
      </ProtectedShell>
    );
  }

  if (!data) {
    return (
      <ProtectedShell>
        <p style={{ color: "var(--text-muted)" }}>Loading platform overview…</p>
      </ProtectedShell>
    );
  }

  const currency = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Platform Overview</h2>
      <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
        Who is using Kruze, is it healthy, is transport operating, is it making money, is it secure — all real
        database aggregates.
      </p>

      <div className="kpi-group">
        <h3>1. Who is using Kruze — Organisations</h3>
        <div className="stat-row">
          <Tile value={data.organisations.total} label="Total organisations" />
          <Tile value={data.organisations.byStatus["ACTIVE"] ?? 0} label="Active" />
          <Tile value={data.organisations.byStatus["PENDING_APPROVAL"] ?? 0} label="Pending approval" warning={(data.organisations.byStatus["PENDING_APPROVAL"] ?? 0) > 0} />
          <Tile value={data.organisations.byStatus["SUSPENDED"] ?? 0} label="Suspended" warning={(data.organisations.byStatus["SUSPENDED"] ?? 0) > 0} />
          <Tile value={data.organisations.corporate} label="Corporate tenants" />
          <Tile value={data.organisations.vendor} label="Vendors" />
          <Tile value={data.organisations.operator} label="Fleet operators" />
          <Tile value={data.organisations.activeRelationships} label="Active relationships" />
        </div>
      </div>

      <div className="kpi-group">
        <h3>Corporate</h3>
        <div className="stat-row">
          <Tile value={data.corporate.organisations} label="Corporate organisations" />
          <Tile value={data.corporate.employees} label="Employees (platform-wide)" />
        </div>
      </div>

      <div className="kpi-group">
        <h3>Vendors</h3>
        <div className="stat-row">
          <Tile value={data.vendors.organisations} label="Vendor organisations" />
          <Tile value={data.vendors.drivers} label="Drivers" />
          <Tile value={data.vendors.vehicles} label="Vehicles" />
          <Tile value={data.vendors.guards} label="Guards" />
        </div>
      </div>

      <div className="kpi-group">
        <h3>2/3. Platform Usage — Is transport operating?</h3>
        <div className="stat-row">
          <Tile value={data.platformUsage.totalUsers} label="Platform users" />
          <Tile value={data.platformUsage.activeMemberships} label="Active memberships" />
          <Tile value={data.platformUsage.tripsTotal} label="Trips (all-time)" />
          <Tile value={data.platformUsage.tripsScheduledLast24h} label="Trips scheduled (24h)" />
          <Tile value={data.platformUsage.tripsRunningNow} label="Trips running now" />
          <Tile value={data.platformUsage.openExceptions} label="Open planning exceptions" warning={data.platformUsage.openExceptions > 0} />
          <Tile value={data.platformUsage.openSafetyEvents} label="Open safety events" warning={data.platformUsage.openSafetyEvents > 0} />
        </div>
      </div>

      <div className="kpi-group">
        <h3>4. Is Kruze making money — Subscriptions</h3>
        <div className="stat-row">
          <Tile value={currency(data.subscription.mrrCents)} label="MRR (active plans)" />
          <Tile value={data.subscription.byStatus["ACTIVE"] ?? 0} label="Active subscriptions" />
          <Tile value={data.subscription.byStatus["TRIAL"] ?? 0} label="On trial" />
          <Tile value={data.subscription.byStatus["SUSPENDED"] ?? 0} label="Suspended" warning={(data.subscription.byStatus["SUSPENDED"] ?? 0) > 0} />
          <Tile value={data.subscription.byStatus["CANCELLED"] ?? 0} label="Cancelled" />
        </div>
      </div>

      <div className="kpi-group">
        <h3>System Health</h3>
        <div className="stat-row">
          <Tile value={data.systemHealth.eventsConsumedLast24h} label="Events consumed (24h)" />
          <Tile value={data.systemHealth.usageRecordsLast24h} label="Usage records written (24h)" />
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          <a href="/system-health">Known-services status →</a>
        </p>
      </div>

      <div className="kpi-group">
        <h3>5. Is Kruze secure — Security</h3>
        <div className="stat-row">
          <Tile value={data.security.auditEventsLast24h} label="Audit events (24h)" />
          <Tile value={data.security.failedLoginsLast24h} label="Failed logins (24h)" warning={data.security.failedLoginsLast24h > 0} />
          <Tile value={data.security.roleChangesLast24h} label="Role changes (24h)" />
          <Tile value={data.security.suspendedOrganisations} label="Suspended tenants" warning={data.security.suspendedOrganisations > 0} />
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          <a href="/security">Security Center →</a> · <a href="/audit-log">Audit Log →</a>
        </p>
      </div>
    </ProtectedShell>
  );
}
