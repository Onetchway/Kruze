"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError, TripDetail } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function TripDetailPage() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !params.id) return;
    api.getTrip(session.accessToken, params.id).then(setTrip).catch((err) => {
      setError(err instanceof ApiError ? err.message : "Failed to load trip");
    });
  }, [session, params.id]);

  if (!trip) {
    return (
      <ProtectedShell title="Trip">
        {error ? <p className="error-text">{error}</p> : <p style={{ color: "var(--text-muted)" }}>Loading…</p>}
      </ProtectedShell>
    );
  }

  const assignment = trip.assignments?.[0];
  const distance = trip.actualDistanceKm ?? trip.estimatedDistanceKm;

  return (
    <ProtectedShell>
      <button className="secondary" onClick={() => router.push("/trips")} style={{ marginBottom: 16 }}>
        ← Back to Trips
      </button>
      <h2 style={{ marginTop: 0 }}>Trip {trip.globalTripId}</h2>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{trip.status.replaceAll("_", " ")}</div>
          <div className="label">Status</div>
        </div>
        <div className="stat-tile">
          <div className="value">{trip.employees?.length ?? 0}</div>
          <div className="label">Employees</div>
        </div>
        <div className="stat-tile">
          <div className="value">{distance != null ? `${distance.toFixed(1)} km` : "—"}</div>
          <div className="label">Distance</div>
        </div>
        <div className={`stat-tile ${trip.incidents?.length ? "warning" : ""}`}>
          <div className="value">{trip.incidents?.length ?? 0}</div>
          <div className="label">Incidents</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Assignment</h3>
        <table>
          <tbody>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Corporate</td>
              <td>{trip.corporateOrg?.displayName ?? "—"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Vendor</td>
              <td>{trip.vendorOrg?.displayName ?? "Unassigned"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Vehicle</td>
              <td>{assignment?.vehicle?.registrationNo ?? "—"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Driver</td>
              <td>{assignment?.driver?.fullName ?? "—"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Guard</td>
              <td>{assignment?.guard?.fullName ?? "None assigned"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Shift</td>
              <td>{trip.shift?.name ?? "—"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Scheduled start</td>
              <td>{new Date(trip.scheduledStartAt).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Stops (pickup / drop sequence)</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Planned ETA</th>
              <th>Actual arrival</th>
            </tr>
          </thead>
          <tbody>
            {trip.stops?.map((s) => (
              <tr key={s.id}>
                <td>{s.sequence}</td>
                <td>{s.stopType}</td>
                <td>{s.plannedEta ? new Date(s.plannedEta).toLocaleTimeString() : "—"}</td>
                <td>{s.actualArrivalAt ? new Date(s.actualArrivalAt).toLocaleTimeString() : "—"}</td>
              </tr>
            ))}
            {(!trip.stops || trip.stops.length === 0) && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  No stop sequence recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Employees on this trip</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trip.employees?.map((te) => (
              <tr key={te.id}>
                <td>
                  <a href={`/employees/${te.employee.id}`}>{te.employee.fullName}</a>
                </td>
                <td>{te.employee.employeeCode}</td>
                <td>
                  <span className="badge">{te.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
