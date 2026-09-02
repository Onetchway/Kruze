"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, Trip, Shift, Driver, Vehicle, OrganisationRelationship } from "@/lib/api";
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

interface LiveSafetySummary {
  overspeedCount: number;
  gpsOfflineCount: number;
  runningTrips: number;
  delayedCount: number;
  routeDeviationCount: number;
}

function statusTone(status: string): string {
  if (status === "SOS_ACTIVE" || status === "BREAKDOWN") return "warning";
  return "";
}

export default function LiveOpsPage() {
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [liveOps, setLiveOps] = useState<LiveSafetySummary | null>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vendors, setVendors] = useState<OrganisationRelationship[]>([]);

  const [vendorOrgId, setVendorOrgId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [officeLabel, setOfficeLabel] = useState("");

  function reloadTrips() {
    if (!session) return;
    api
      .listTrips(session.accessToken, {
        status: filter,
        vendorOrgId: vendorOrgId || undefined,
        shiftId: shiftId || undefined,
        driverId: driverId || undefined,
        vehicleId: vehicleId || undefined,
        officeLabel: officeLabel || undefined,
      })
      .then(setTrips)
      .catch(() => {});
  }

  useEffect(() => {
    reloadTrips();
    const interval = setInterval(reloadTrips, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filter, vendorOrgId, shiftId, driverId, vehicleId, officeLabel]);

  useEffect(() => {
    if (!session) return;
    const load = () => api.liveSafetySummary(session.accessToken).then(setLiveOps).catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    api.listShifts(session.accessToken).then(setShifts).catch(() => {});
    api.listDrivers(session.accessToken).then(setDrivers).catch(() => {});
    api.listVehicles(session.accessToken).then(setVehicles).catch(() => {});
    api.listRelationships(session.accessToken).then((rels) => setVendors(rels.filter((r) => r.type === "CORPORATE_VENDOR" && r.status === "ACTIVE"))).catch(() => {});
  }, [session]);

  function vendorLabel(rel: OrganisationRelationship): { id: string; name: string } {
    const otherId = rel.sourceOrgId === session?.organisationId ? rel.targetOrgId : rel.sourceOrgId;
    const org = rel.sourceOrgId === session?.organisationId ? rel.targetOrg : rel.sourceOrg;
    return { id: otherId, name: org?.displayName ?? otherId };
  }

  const running = trips.filter((t) => t.status === "RUNNING" || t.status === "EN_ROUTE_TO_FIRST_PICKUP");
  const sos = trips.filter((t) => t.status === "SOS_ACTIVE");
  const breakdown = trips.filter((t) => t.status === "BREAKDOWN");
  const noShow = trips.filter((t) => t.status === "NO_SHOW");
  const unassigned = trips.filter((t) => t.status === "CREATED" || t.status === "REASSIGNING");

  const visible = useMemo(() => trips, [trips]);

  function clearFilters() {
    setVendorOrgId("");
    setShiftId("");
    setDriverId("");
    setVehicleId("");
    setOfficeLabel("");
  }

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
        <div className={`stat-tile ${(liveOps?.delayedCount ?? 0) > 0 ? "warning" : ""}`}>
          <div className="value">{liveOps?.delayedCount ?? "—"}</div>
          <div className="label">Delayed</div>
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

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Vendor</label>
            <select value={vendorOrgId} onChange={(e) => setVendorOrgId(e.target.value)}>
              <option value="">All vendors</option>
              {vendors.map((r) => {
                const { id, name } = vendorLabel(r);
                return (
                  <option key={r.id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Shift</label>
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              <option value="">All shifts</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Vehicle</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">All vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Driver</label>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">All drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Office / City</label>
            <input value={officeLabel} onChange={(e) => setOfficeLabel(e.target.value)} placeholder="Search office label" />
          </div>
          <button className="secondary" type="button" onClick={clearFilters}>
            Clear filters
          </button>
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
                <td>
                  <a href={`/trips/${t.id}`}>{t.globalTripId}</a>
                </td>
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
