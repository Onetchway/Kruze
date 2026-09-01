"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, Trip } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const STATUS_FILTERS = [
  "ALL",
  "RUNNING",
  "SCHEDULED",
  "EN_ROUTE_TO_FIRST_PICKUP",
  "SOS_ACTIVE",
  "BREAKDOWN",
  "NO_SHOW",
  "COMPLETED",
];

function statusTone(status: string): string {
  if (status === "SOS_ACTIVE" || status === "BREAKDOWN") return "warning";
  return "";
}

export default function LiveOpsPage() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (!session) return;
    const load = () => api.listTrips(session.accessToken).then(setTrips).catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [session]);

  const running = trips.filter((t) => t.status === "RUNNING" || t.status === "EN_ROUTE_TO_FIRST_PICKUP");
  const sos = trips.filter((t) => t.status === "SOS_ACTIVE");
  const breakdown = trips.filter((t) => t.status === "BREAKDOWN");
  const noShow = trips.filter((t) => t.status === "NO_SHOW");
  const unassigned = trips.filter((t) => t.status === "CREATED" || t.status === "REASSIGNING");

  const visible = useMemo(
    () => (filter === "ALL" ? trips : trips.filter((t) => t.status === filter)),
    [trips, filter],
  );

  return (
    <ProtectedShell
      title="Live Operations"
      subtitle="Today's trips at a glance — exceptions surface first. Map view is a stub pending a Maps/GPS provider key."
    >
      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{running.length}</div>
          <div className="label">Running</div>
        </div>
        <div className={`stat-tile ${sos.length > 0 ? "warning" : ""}`}>
          <div className="value">{sos.length}</div>
          <div className="label">SOS active</div>
        </div>
        <div className={`stat-tile ${breakdown.length > 0 ? "warning" : ""}`}>
          <div className="value">{breakdown.length}</div>
          <div className="label">Breakdown</div>
        </div>
        <div className={`stat-tile ${noShow.length > 0 ? "warning" : ""}`}>
          <div className="value">{noShow.length}</div>
          <div className="label">No-show</div>
        </div>
        <div className={`stat-tile ${unassigned.length > 0 ? "warning" : ""}`}>
          <div className="value">{unassigned.length}</div>
          <div className="label">Unassigned</div>
        </div>
      </div>

      <div className="card">
        <div
          style={{
            height: 220,
            borderRadius: 10,
            background:
              "repeating-linear-gradient(45deg, var(--bg), var(--bg) 10px, var(--surface) 10px, var(--surface) 20px)",
            border: "1px dashed var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 13,
            textAlign: "center",
            padding: 16,
          }}
        >
          Live vehicle map — connect a Maps/GPS provider (Google Maps, Mapbox) under Settings → Integrations
          to render real-time vehicle positions here.
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s} className={filter === s ? "" : "secondary"} onClick={() => setFilter(s)}>
              {s.replaceAll("_", " ")}
            </button>
          ))}
        </div>
        <table>
          <thead>
            <tr>
              <th>Trip</th>
              <th>Status</th>
              <th>Scheduled start</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id}>
                <td>{t.globalTripId}</td>
                <td className={statusTone(t.status)}>
                  <span className="badge">{t.status.replaceAll("_", " ")}</span>
                </td>
                <td>{new Date(t.scheduledStartAt).toLocaleString()}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  No trips in this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
