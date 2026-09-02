"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Vehicle } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const FLEET_ROLES = ["VENDOR_ADMIN", "FLEET_OPERATOR_ADMIN"];
const CORPORATE_ROLES = ["CORPORATE_TRANSPORT_ADMIN", "CORPORATE_HR"];

function CorporateFleetNetwork() {
  const { session } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!session) return;
    api.listVehiclesNetwork(session.accessToken).then(setVehicles).catch(() => {});
  }, [session]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Fleet</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Vehicles eligible for your transport programme, via your connected vendors. This platform doesn&apos;t own or
        edit a vendor&apos;s fleet master — that stays with the vendor.
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Registration</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Power</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td>{v.globalVehicleId}</td>
                <td>{v.registrationNo}</td>
                <td>{v.vehicleType}</td>
                <td>{v.capacity}</td>
                <td>{v.isElectric ? `EV${v.rangeKm ? ` · ${v.rangeKm}km` : ""}` : v.fuelType}</td>
                <td>
                  <span className="badge">{v.status}</span>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No vehicles from your connected vendors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FleetContent() {
  const { session } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [registrationNo, setRegistrationNo] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [vehicleType, setVehicleType] = useState("SEDAN");
  const [capacity, setCapacity] = useState("4");
  const [fuelType, setFuelType] = useState("PETROL");
  const [isElectric, setIsElectric] = useState(false);
  const [rangeKm, setRangeKm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listVehicles(session.accessToken).then(setVehicles).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createVehicle(session.accessToken, {
        registrationNo,
        make: make || undefined,
        model: model || undefined,
        vehicleType,
        capacity: capacity ? Number(capacity) : undefined,
        fuelType: isElectric ? "ELECTRIC" : fuelType,
        isElectric,
        rangeKm: isElectric && rangeKm ? Number(rangeKm) : undefined,
      });
      setRegistrationNo("");
      setMake("");
      setModel("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add vehicle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Fleet</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Vehicles here become eligible for auto-assignment once a corporate connects your organisation and grants
        eligibility — compliance documents and maintenance status gate every assignment automatically.
      </p>

      <div className="card">
        <form onSubmit={handleCreate}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: "1 1 160px" }}>
              <label>Registration number</label>
              <input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} required placeholder="KA01AB1234" />
            </div>
            <div className="field" style={{ flex: "1 1 120px" }}>
              <label>Make</label>
              <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" />
            </div>
            <div className="field" style={{ flex: "1 1 120px" }}>
              <label>Model</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Innova" />
            </div>
            <div className="field" style={{ flex: "1 1 140px" }}>
              <label>Vehicle type</label>
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="VAN">Van / Tempo</option>
                <option value="MINIBUS">Minibus</option>
                <option value="BUS">Bus</option>
              </select>
            </div>
            <div className="field" style={{ flex: "1 1 100px" }}>
              <label>Capacity</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ flex: "1 1 140px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={isElectric}
                  onChange={(e) => setIsElectric(e.target.checked)}
                  style={{ width: "auto", marginRight: 8 }}
                />
                Electric vehicle
              </label>
            </div>
            {isElectric ? (
              <div className="field" style={{ flex: "1 1 140px" }}>
                <label>Range (km)</label>
                <input type="number" min={0} value={rangeKm} onChange={(e) => setRangeKm(e.target.value)} placeholder="250" />
              </div>
            ) : (
              <div className="field" style={{ flex: "1 1 140px" }}>
                <label>Fuel type</label>
                <select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                  <option value="PETROL">Petrol</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>
            )}
            <button type="submit" disabled={busy}>
              Add vehicle
            </button>
          </div>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Registration</th>
              <th>Make / Model</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Power</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td>{v.globalVehicleId}</td>
                <td>{v.registrationNo}</td>
                <td>
                  {v.make} {v.model}
                </td>
                <td>{v.vehicleType}</td>
                <td>{v.capacity}</td>
                <td>{v.isElectric ? `EV${v.rangeKm ? ` · ${v.rangeKm}km` : ""}` : v.fuelType}</td>
                <td>
                  <span className="badge">{v.status}</span>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  No vehicles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function FleetPage() {
  const { session } = useAuth();

  return (
    <ProtectedShell>
      {session && CORPORATE_ROLES.includes(session.role) ? (
        <CorporateFleetNetwork />
      ) : session && !FLEET_ROLES.includes(session.role) ? (
        <div className="card">
          <p style={{ margin: 0 }}>
            Fleet management is available for Fleet Operator and Vendor accounts. Sign in with one of those, or create
            one from the login page.
          </p>
        </div>
      ) : (
        <FleetContent />
      )}
    </ProtectedShell>
  );
}
