"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, Trip } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function TripsPage() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (!session) return;
    api.listTrips(session.accessToken).then(setTrips).catch(() => {});
  }, [session]);

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Trips</h2>
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
                  No trips yet — generate a plan from the Dashboard.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
