"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, Trip, LIVE_TRIP_STATUSES } from "@/lib/api";
import { useRealtimeEvent } from "@/lib/realtime";
import { ProtectedShell } from "@/components/ProtectedShell";

function statusBadgeClass(status: string): string {
  if (status === "SOS_ACTIVE" || status === "BREAKDOWN") return "badge danger";
  if (status === "COMPLETED") return "badge success";
  if (LIVE_TRIP_STATUSES.includes(status)) return "badge warning";
  return "badge";
}

export default function TripsPage() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listTrips(session.accessToken).then(setTrips).catch((err) => setError(err.message));
  }

  useEffect(() => {
    reload();
    // Fallback poll — the socket push below is the primary update path, this
    // just covers reconnect gaps and events missed while backgrounded.
    const interval = setInterval(reload, 30_000);
    return () => clearInterval(interval);
  }, [session]);

  useRealtimeEvent(session?.accessToken, "trip.status", reload);
  useRealtimeEvent(session?.accessToken, "incident.created", reload);

  const visible = showAll ? trips : trips.filter((t) => LIVE_TRIP_STATUSES.includes(t.status));
  const sosCount = trips.filter((t) => t.status === "SOS_ACTIVE").length;
  const breakdownCount = trips.filter((t) => t.status === "BREAKDOWN").length;

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Live Trips</h2>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{visible.length}</div>
          <div className="label">{showAll ? "Total trips" : "Live trips"}</div>
        </div>
        <div className={`stat-tile${sosCount > 0 ? " danger" : ""}`}>
          <div className="value">{sosCount}</div>
          <div className="label">Active SOS</div>
        </div>
        <div className={`stat-tile${breakdownCount > 0 ? " danger" : ""}`}>
          <div className="value">{breakdownCount}</div>
          <div className="label">Breakdowns</div>
        </div>
      </div>

      <div className="card">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
          <input type="checkbox" style={{ width: "auto" }} checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show all trips (not just live)
        </label>
        {error && <p className="error-text">{error}</p>}
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Trip</th>
              <th>Status</th>
              <th>Scheduled start</th>
              <th>Distance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id}>
                <td>{t.globalTripId}</td>
                <td>
                  <span className={statusBadgeClass(t.status)}>{t.status}</span>
                </td>
                <td>{new Date(t.scheduledStartAt).toLocaleString()}</td>
                <td>{t.actualDistanceKm ?? t.estimatedDistanceKm ?? "—"} km</td>
                <td>
                  <a href={`/trips/${t.id}`}>View →</a>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  {showAll ? "No trips yet." : "No live trips right now."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
