"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError, TripDetail, LocationPing, Driver, Vehicle } from "@/lib/api";
import { useRealtimeEvent } from "@/lib/realtime";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const { session } = useAuth();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [location, setLocation] = useState<LocationPing | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [breakdownDescription, setBreakdownDescription] = useState("");
  const [replaceDriverId, setReplaceDriverId] = useState("");
  const [replaceVehicleId, setReplaceVehicleId] = useState("");
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api
      .getTrip(session.accessToken, tripId)
      .then(setTrip)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
      });
    api.latestLocation(session.accessToken, tripId).then(setLocation).catch(() => {});
  }

  useEffect(() => {
    reload();
    // Fallback poll — the socket pushes below are the primary update path.
    const interval = setInterval(reload, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tripId]);

  useRealtimeEvent(session?.accessToken, "trip.status", (payload) => {
    if ((payload as { tripId?: string }).tripId === tripId) reload();
  });
  useRealtimeEvent(session?.accessToken, "trip.assignment", (payload) => {
    if ((payload as { tripId?: string }).tripId === tripId) reload();
  });
  useRealtimeEvent(session?.accessToken, "trip.location", (payload) => {
    const ping = payload as { tripId?: string; latitude: number; longitude: number; speed: number | null; recordedAt: string };
    if (ping.tripId === tripId) {
      setLocation({ id: `live-${ping.recordedAt}`, latitude: ping.latitude, longitude: ping.longitude, speed: ping.speed, recordedAt: ping.recordedAt });
    }
  });

  useEffect(() => {
    if (!session) return;
    api.listDrivers(session.accessToken).then(setDrivers).catch(() => {});
    api.listVehicles(session.accessToken).then(setVehicles).catch(() => {});
  }, [session]);

  async function handleBreakdown(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.reportBreakdown(session.accessToken, tripId, breakdownDescription || undefined);
      setActionMessage("Breakdown reported.");
      setBreakdownDescription("");
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to report breakdown");
    } finally {
      setBusy(false);
    }
  }

  async function handleReplace(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.replaceResource(session.accessToken, tripId, {
        driverId: replaceDriverId || undefined,
        vehicleId: replaceVehicleId || undefined,
      });
      setActionMessage("Replacement assigned.");
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to assign replacement");
    } finally {
      setBusy(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !otpChallengeId) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.overrideOtp(session.accessToken, otpChallengeId, overrideReason || "Supervisor override");
      setActionMessage("OTP overridden.");
      setOtpChallengeId("");
      setOverrideReason("");
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to override OTP");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <ProtectedShell>
        <p className="error-text">Trip not found, or you&rsquo;re not a party to it.</p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <p style={{ marginTop: 0 }}>
        <a href="/trips">← Live Trips</a>
      </p>
      {!trip ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <>
          <h2 style={{ marginTop: 0 }}>
            {trip.globalTripId} <span className="badge">{trip.status}</span>
          </h2>

          <div className={`card${trip.status === "SOS_ACTIVE" || trip.status === "BREAKDOWN" ? " alert" : ""}`}>
            <h3 style={{ marginTop: 0 }}>Live position</h3>
            {location ? (
              <div className="map-placeholder">
                lat {location.latitude.toFixed(5)}, lng {location.longitude.toFixed(5)}
                {location.speed !== null && ` — ${location.speed.toFixed(0)} km/h`}
                <br />
                as of {new Date(location.recordedAt).toLocaleTimeString()}
              </div>
            ) : (
              <div className="map-placeholder">No GPS ping received yet.</div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Employees</h3>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Pickup verified</th>
                  <th>Drop verified</th>
                </tr>
              </thead>
              <tbody>
                {trip.employees.map((e) => (
                  <tr key={e.id}>
                    <td>{e.employeeId}</td>
                    <td>
                      <span className="badge">{e.status}</span>
                    </td>
                    <td>{e.pickupVerifiedAt ? new Date(e.pickupVerifiedAt).toLocaleTimeString() : "—"}</td>
                    <td>{e.dropVerifiedAt ? new Date(e.dropVerifiedAt).toLocaleTimeString() : "—"}</td>
                  </tr>
                ))}
                {trip.employees.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                      No employees on this trip.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Current assignment</h3>
            {trip.assignments.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No active assignment.</p>
            ) : (
              trip.assignments.map((a) => (
                <p key={a.id}>
                  Driver: {a.driverId ?? "—"} · Vehicle: {a.vehicleId ?? "—"} · Guard: {a.guardId ?? "—"} ·{" "}
                  <span className="badge">{a.source}</span>
                </p>
              ))
            )}
          </div>

          {actionMessage && (
            <div className="card" style={{ borderColor: "var(--success)" }}>
              {actionMessage}
            </div>
          )}
          {actionError && <p className="error-text">{actionError}</p>}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Report breakdown</h3>
            <form onSubmit={handleBreakdown} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
                <label>Description</label>
                <input value={breakdownDescription} onChange={(e) => setBreakdownDescription(e.target.value)} />
              </div>
              <button type="submit" className="danger" disabled={busy || trip.status === "BREAKDOWN"}>
                Report breakdown
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Assign replacement</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
              Only valid while the trip is in BREAKDOWN state. Choices below are drawn from your organisation&rsquo;s
              fleet.
            </p>
            <form onSubmit={handleReplace} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
                <label>Driver</label>
                <select value={replaceDriverId} onChange={(e) => setReplaceDriverId(e.target.value)}>
                  <option value="">— none —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
                <label>Vehicle</label>
                <select value={replaceVehicleId} onChange={(e) => setReplaceVehicleId(e.target.value)}>
                  <option value="">— none —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNo}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={busy || trip.status !== "BREAKDOWN" || (!replaceDriverId && !replaceVehicleId)}>
                Assign replacement
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Supervisor OTP override</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
              For a pickup/drop stuck on a code the employee can&rsquo;t complete — requires the OTP challenge id
              (visible in the trip&rsquo;s event log below).
            </p>
            <form onSubmit={handleOverride} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
                <label>OTP challenge id</label>
                <input value={otpChallengeId} onChange={(e) => setOtpChallengeId(e.target.value)} required />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
                <label>Reason</label>
                <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
              </div>
              <button type="submit" disabled={busy || !otpChallengeId}>
                Override
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Event log</h3>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {trip.events.map((ev) => (
                  <tr key={ev.id}>
                    <td>{new Date(ev.createdAt).toLocaleString()}</td>
                    <td>{ev.type}</td>
                  </tr>
                ))}
                {trip.events.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ color: "var(--text-muted)" }}>
                      No events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProtectedShell>
  );
}
