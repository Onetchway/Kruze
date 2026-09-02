"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Trip } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const ROUTED_STATUSES = new Set(["SCHEDULED", "RESOURCES_ASSIGNED", "DRIVER_ACCEPTED", "EN_ROUTE_TO_FIRST_PICKUP", "RUNNING", "COMPLETED"]);

export default function RoutesPage() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listTrips(session.accessToken).then(setTrips).catch(() => {});
  }

  useEffect(reload, [session]);

  const routed = trips.filter((t) => ROUTED_STATUSES.has(t.status));

  async function handleAccept(id: string) {
    if (!session) return;
    setBusyId(id);
    setError(null);
    try {
      await api.acceptTripRoute(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to accept route");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    if (!session) return;
    setBusyId(id);
    setError(null);
    try {
      await api.rejectTripRoute(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject route");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReoptimize(id: string) {
    if (!session) return;
    setBusyId(id);
    setError(null);
    try {
      await api.requestTripReoptimization(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to request reoptimization");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProtectedShell
      title="Routes"
      subtitle="Each trip's stop sequence — Kruze plans and optimizes routes automatically. Accept/reject the plan or ask for a re-run below."
    >
      <div className="card">
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Trip</th>
              <th>Shift</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Route</th>
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
                <td>
                  <span className={`badge ${t.routeAcceptanceStatus === "REJECTED" ? "warning" : ""}`}>
                    {t.routeAcceptanceStatus ?? "PENDING"}
                  </span>
                  {t.reoptimizationRequested && <span className="badge warning" style={{ marginLeft: 6 }}>Reopt requested</span>}
                </td>
                <td>{new Date(t.scheduledStartAt).toLocaleString()}</td>
                <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button disabled={busyId === t.id || t.routeAcceptanceStatus === "ACCEPTED"} onClick={() => handleAccept(t.id)}>
                    Accept
                  </button>
                  <button
                    className="secondary"
                    disabled={busyId === t.id || t.routeAcceptanceStatus === "REJECTED"}
                    onClick={() => handleReject(t.id)}
                  >
                    Reject
                  </button>
                  <button className="secondary" disabled={busyId === t.id || t.reoptimizationRequested} onClick={() => handleReoptimize(t.id)}>
                    Request Reoptimization
                  </button>
                  <a href={`/trips/${t.id}`}>View stop sequence →</a>
                </td>
              </tr>
            ))}
            {routed.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  No routed trips yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    </ProtectedShell>
  );
}
