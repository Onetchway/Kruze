"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, PlatformOperationsOverview, PlatformTripRow } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const TRIP_STATUSES = [
  "",
  "CREATED",
  "SCHEDULED",
  "RESOURCES_ASSIGNED",
  "DRIVER_ACCEPTED",
  "EN_ROUTE_TO_FIRST_PICKUP",
  "RUNNING",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "BREAKDOWN",
  "SOS_ACTIVE",
  "PAUSED",
  "REASSIGNING",
  "FAILED",
];

export default function OperationsPage() {
  const { session } = useAuth();
  const [overview, setOverview] = useState<PlatformOperationsOverview | null>(null);
  const [trips, setTrips] = useState<PlatformTripRow[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api.getOperationsOverview(session.accessToken).then(setOverview).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    api
      .listPlatformTrips(session.accessToken, { status: status || undefined })
      .then((r) => setTrips(r.trips))
      .catch(() => {});
  }, [session, status]);

  const lo = overview?.liveOperations;

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Transport Operations</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Platform-wide operational visibility — today&apos;s trip pipeline, SOS/exception counts. A live map is out of
        scope in this environment (no Maps/GPS provider key) — counts and lists only.
      </p>

      {error && <p className="error-text">{error}</p>}

      {lo && (
        <div className="kpi-group">
          <h3>Live Operations — today</h3>
          <div className="stat-row">
            <div className="stat-tile">
              <div className="value">{lo.planned}</div>
              <div className="label">Planned</div>
            </div>
            <div className="stat-tile">
              <div className="value">{lo.assigned}</div>
              <div className="label">Assigned</div>
            </div>
            <div className="stat-tile">
              <div className="value">{lo.driverEnRoute}</div>
              <div className="label">Driver en route</div>
            </div>
            <div className="stat-tile">
              <div className="value">{lo.pickupStarted}</div>
              <div className="label">Pickup started</div>
            </div>
            <div className="stat-tile">
              <div className="value">{lo.inProgress}</div>
              <div className="label">In progress</div>
            </div>
            <div className="stat-tile">
              <div className="value">{lo.completed}</div>
              <div className="label">Completed</div>
            </div>
            <div className={`stat-tile${lo.cancelled > 0 ? " warning" : ""}`}>
              <div className="value">{lo.cancelled}</div>
              <div className="label">Cancelled</div>
            </div>
            <div className={`stat-tile${lo.exceptions > 0 ? " warning" : ""}`}>
              <div className="value">{lo.exceptions}</div>
              <div className="label">Exceptions</div>
            </div>
          </div>
        </div>
      )}

      {overview && (
        <div className="kpi-group">
          <h3>SOS & exceptions</h3>
          <div className="stat-row">
            <div className={`stat-tile${overview.sos.activeTripsInSos > 0 ? " warning" : ""}`}>
              <div className="value">{overview.sos.activeTripsInSos}</div>
              <div className="label">Trips currently in SOS</div>
            </div>
            <div className={`stat-tile${overview.planExceptions.open > 0 ? " warning" : ""}`}>
              <div className="value">{overview.planExceptions.open}</div>
              <div className="label">Open plan exceptions</div>
            </div>
            {Object.entries(overview.sos.openIncidentsByCategory).map(([cat, count]) => (
              <div key={cat} className="stat-tile warning">
                <div className="value">{count}</div>
                <div className="label">{cat} (open)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div className="field">
          <label>Filter by status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {TRIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Corporate</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Scheduled start</th>
              <th>Driver / Vehicle</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.globalTripId}</td>
                <td>{t.corporateOrg.displayName}</td>
                <td>{t.vendorOrg?.displayName ?? "—"}</td>
                <td>
                  <span className={`badge${["SOS_ACTIVE", "BREAKDOWN", "CANCELLED", "NO_SHOW", "FAILED"].includes(t.status) ? " danger" : t.status === "COMPLETED" ? " success" : ""}`}>
                    {t.status}
                  </span>
                </td>
                <td>{new Date(t.scheduledStartAt).toLocaleString()}</td>
                <td>
                  {t.assignments[0]?.driver?.fullName ?? "—"} / {t.assignments[0]?.vehicle?.registrationNo ?? "—"}
                </td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No trips match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
