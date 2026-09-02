"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, Trip } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const ROUTED_STATUSES = new Set(["SCHEDULED", "RESOURCES_ASSIGNED", "DRIVER_ACCEPTED", "EN_ROUTE_TO_FIRST_PICKUP", "RUNNING", "COMPLETED"]);

export default function RoutesPage() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (!session) return;
    api.listTrips(session.accessToken).then(setTrips).catch(() => {});
  }, [session]);

  const routed = trips.filter((t) => ROUTED_STATUSES.has(t.status));

  return (
    <ProtectedShell
      title="Routes"
      subtitle="Each trip's stop sequence — Kruze plans and optimizes routes automatically; nothing here needs manual routing."
    >
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Trip</th>
              <th>Shift</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Scheduled start</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {routed.map((t) => (
              <tr key={t.id}>
                <td>{t.globalTripId}</td>
                <td>{t.shift?.name ?? "—"}</td>
                <td>{t.vendorOrg?.displayName ?? "—"}</td>
                <td>
                  <span className="badge">{t.status.replaceAll("_", " ")}</span>
                </td>
                <td>{new Date(t.scheduledStartAt).toLocaleString()}</td>
                <td>
                  <a href={`/trips/${t.id}`}>View stop sequence →</a>
                </td>
              </tr>
            ))}
            {routed.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No routed trips yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
