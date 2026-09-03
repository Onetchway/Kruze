"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  api,
  ApiError,
  PlatformDriverRow,
  PlatformVehicleRow,
  PlatformGuardRow,
  PlatformFleetSummary,
} from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

type Tab = "drivers" | "vehicles" | "guards";

function statusBadge(status: string) {
  if (status === "ACTIVE") return " success";
  if (status === "BLOCKED" || status === "SUSPENDED") return " danger";
  return "";
}

export default function FleetPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("drivers");
  const [summary, setSummary] = useState<PlatformFleetSummary | null>(null);
  const [drivers, setDrivers] = useState<PlatformDriverRow[]>([]);
  const [vehicles, setVehicles] = useState<PlatformVehicleRow[]>([]);
  const [guards, setGuards] = useState<PlatformGuardRow[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.getFleetSummary(session.accessToken).then(setSummary).catch(() => {});
    const params = { q: q || undefined };
    if (tab === "drivers") api.listPlatformDrivers(session.accessToken, params).then(setDrivers).catch(() => {});
    if (tab === "vehicles") api.listPlatformVehicles(session.accessToken, params).then(setVehicles).catch(() => {});
    if (tab === "guards") api.listPlatformGuards(session.accessToken, params).then(setGuards).catch(() => {});
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [session, tab, q]);

  async function act(fn: () => Promise<unknown>, id: string) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Fleet & Resources</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Platform-wide read visibility into every Driver, Vehicle and Guard global identity, their vendor
        relationships and compliance status, with Block/Suspend/Unblock actions.
      </p>

      {summary && (
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{summary.drivers.total}</div>
            <div className="label">Drivers</div>
          </div>
          <div className="stat-tile">
            <div className="value">{summary.vehicles.total}</div>
            <div className="label">Vehicles</div>
          </div>
          <div className="stat-tile">
            <div className="value">{summary.guards.total}</div>
            <div className="label">Guards</div>
          </div>
          <div className={`stat-tile${(summary.drivers.byStatus["BLOCKED"] ?? 0) + (summary.drivers.byStatus["SUSPENDED"] ?? 0) > 0 ? " warning" : ""}`}>
            <div className="value">{(summary.drivers.byStatus["BLOCKED"] ?? 0) + (summary.drivers.byStatus["SUSPENDED"] ?? 0)}</div>
            <div className="label">Drivers blocked/suspended</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
        {(["drivers", "vehicles", "guards"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? undefined : "secondary"} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginLeft: "auto", maxWidth: 220 }}
        />
      </div>

      <div className="card">
        {error && <p className="error-text">{error}</p>}

        {tab === "drivers" && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Vendor relationships</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.globalDriverId}</td>
                  <td>{d.fullName}</td>
                  <td>{d.phone}</td>
                  <td>
                    {d.vendorRelationships.map((r) => (
                      <span key={r.id} className="badge" style={{ marginRight: 4 }}>
                        {r.vendorOrg.displayName} ({r.status})
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`badge${statusBadge(d.status)}`}>{d.status}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {d.status !== "BLOCKED" && (
                      <button disabled={busyId === d.id} className="secondary" onClick={() => act(() => api.blockDriver(session!.accessToken, d.id), d.id)}>
                        Block
                      </button>
                    )}{" "}
                    {d.status !== "SUSPENDED" && (
                      <button disabled={busyId === d.id} className="secondary" onClick={() => act(() => api.suspendDriver(session!.accessToken, d.id), d.id)}>
                        Suspend
                      </button>
                    )}{" "}
                    {d.status !== "ACTIVE" && (
                      <button disabled={busyId === d.id} onClick={() => act(() => api.unblockDriver(session!.accessToken, d.id), d.id)}>
                        Unblock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                    No drivers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "vehicles" && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Registration</th>
                <th>Make / model</th>
                <th>Vendor relationships</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.globalVehicleId}</td>
                  <td>{v.registrationNo}</td>
                  <td>
                    {v.make ?? "—"} {v.model ?? ""}
                  </td>
                  <td>
                    {v.vendorRelationships.map((r) => (
                      <span key={r.id} className="badge" style={{ marginRight: 4 }}>
                        {r.vendorOrg.displayName} ({r.status})
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`badge${statusBadge(v.status)}`}>{v.status}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {v.status !== "BLOCKED" && (
                      <button disabled={busyId === v.id} className="secondary" onClick={() => act(() => api.blockVehicle(session!.accessToken, v.id), v.id)}>
                        Block
                      </button>
                    )}{" "}
                    {v.status !== "ACTIVE" && (
                      <button disabled={busyId === v.id} onClick={() => act(() => api.unblockVehicle(session!.accessToken, v.id), v.id)}>
                        Unblock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                    No vehicles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "guards" && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Vendor relationships</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {guards.map((g) => (
                <tr key={g.id}>
                  <td className="mono">{g.globalGuardId}</td>
                  <td>{g.fullName}</td>
                  <td>{g.phone}</td>
                  <td>
                    {g.vendorRelationships.map((r) => (
                      <span key={r.id} className="badge" style={{ marginRight: 4 }}>
                        {r.vendorOrg.displayName} ({r.status})
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`badge${statusBadge(g.status)}`}>{g.status}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {g.status !== "BLOCKED" && (
                      <button disabled={busyId === g.id} className="secondary" onClick={() => act(() => api.blockGuard(session!.accessToken, g.id), g.id)}>
                        Block
                      </button>
                    )}{" "}
                    {g.status !== "ACTIVE" && (
                      <button disabled={busyId === g.id} onClick={() => act(() => api.unblockGuard(session!.accessToken, g.id), g.id)}>
                        Unblock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {guards.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                    No guards found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </ProtectedShell>
  );
}
