"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, Trip } from "@/lib/api";
import { Shell } from "@/components/Shell";

export default function TripsPage() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (!session) return;
    api.listTrips(session.accessToken).then(setTrips).catch(() => {});
  }, [session]);

  return (
    <Shell>
      <h2 style={{ marginTop: 0 }}>Trips</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Trips a corporate has assigned to your fleet. Driver acceptance and live status update here as the driver
        app reports progress.
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Status</th>
              <th>Scheduled start</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{t.globalTripId}</td>
                <td>
                  <span className="badge">{t.status}</span>
                </td>
                <td>{new Date(t.scheduledStartAt).toLocaleString()}</td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  No trips assigned to your fleet yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
