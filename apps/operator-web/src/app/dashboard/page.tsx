"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, Vehicle, Driver, Guard, Trip } from "@/lib/api";
import { Shell } from "@/components/Shell";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
}

const ACTIVE_TRIP_STATUSES = new Set(["DRIVER_ACCEPTED", "EN_ROUTE_TO_FIRST_PICKUP", "RUNNING", "PAUSED", "SOS_ACTIVE"]);

export default function DashboardPage() {
  const { session } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (!session) return;
    api.listVehicles(session.accessToken).then(setVehicles).catch(() => {});
    api.listDrivers(session.accessToken).then(setDrivers).catch(() => {});
    api.listGuards(session.accessToken).then(setGuards).catch(() => {});
    api.listTrips(session.accessToken).then(setTrips).catch(() => {});
  }, [session]);

  const tripsToday = trips.filter((t) => isToday(t.scheduledStartAt));
  const activeNow = trips.filter((t) => ACTIVE_TRIP_STATUSES.has(t.status));

  return (
    <Shell>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <p style={{ color: "var(--text-muted)" }}>An at-a-glance view of your fleet and today&rsquo;s assigned trips.</p>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{vehicles.filter((v) => v.status === "ACTIVE").length}</div>
          <div className="label">Active vehicles</div>
        </div>
        <div className="stat-tile">
          <div className="value">{drivers.filter((d) => d.status === "ACTIVE").length}</div>
          <div className="label">Active drivers</div>
        </div>
        <div className="stat-tile">
          <div className="value">{guards.filter((g) => g.status === "ACTIVE").length}</div>
          <div className="label">Active guards</div>
        </div>
        <div className="stat-tile">
          <div className="value">{tripsToday.length}</div>
          <div className="label">Trips today</div>
        </div>
        <div className="stat-tile">
          <div className="value">{activeNow.length}</div>
          <div className="label">In progress now</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Today&rsquo;s trips</h3>
        <table>
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Status</th>
              <th>Scheduled start</th>
            </tr>
          </thead>
          <tbody>
            {tripsToday.map((t) => (
              <tr key={t.id}>
                <td>{t.globalTripId}</td>
                <td>
                  <span className="badge">{t.status}</span>
                </td>
                <td>{new Date(t.scheduledStartAt).toLocaleTimeString()}</td>
              </tr>
            ))}
            {tripsToday.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  No trips scheduled for today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
