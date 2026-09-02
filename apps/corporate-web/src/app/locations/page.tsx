"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Location, LocationRequest, LocationType, PickupPointType } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const LOCATION_TYPES: LocationType[] = ["OFFICE", "CAMPUS", "PARKING", "DEPOT"];
const PICKUP_POINT_TYPES: PickupPointType[] = ["METRO", "SAFE_ZONE", "OTHER"];

export default function LocationsPage() {
  const { session } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [requests, setRequests] = useState<LocationRequest[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState<LocationType>("OFFICE");
  const [pickupPointType, setPickupPointType] = useState<PickupPointType | "">("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; address: string; city: string; type: LocationType }>({
    name: "",
    address: "",
    city: "",
    type: "OFFICE",
  });

  const [reqName, setReqName] = useState("");
  const [reqCity, setReqCity] = useState("");
  const [reqReason, setReqReason] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listLocations(session.accessToken).then(setLocations).catch(() => {});
    api.listLocationRequests(session.accessToken, "PENDING").then(setRequests).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.createLocation(session.accessToken, {
        name,
        code,
        address: address || undefined,
        city: city || undefined,
        type,
        pickupPointType: pickupPointType || undefined,
      });
      setName("");
      setCode("");
      setAddress("");
      setCity("");
      setPickupPointType("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add drop location");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (!session) return;
    try {
      await api.removeLocation(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove drop location");
    }
  }

  function startEdit(l: Location) {
    setEditingId(l.id);
    setEditForm({ name: l.name, address: l.address ?? "", city: l.city ?? "", type: l.type ?? "OFFICE" });
  }

  async function handleSaveEdit(id: string) {
    if (!session) return;
    try {
      await api.updateLocation(session.accessToken, id, {
        name: editForm.name,
        address: editForm.address || undefined,
        city: editForm.city || undefined,
        type: editForm.type,
      });
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update location");
    }
  }

  async function handleRequestLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.requestLocation(session.accessToken, { name: reqName, city: reqCity || undefined, reason: reqReason || undefined });
      setReqName("");
      setReqCity("");
      setReqReason("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit location request");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveRequest(id: string) {
    if (!session) return;
    try {
      await api.approveLocationRequest(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve request");
    }
  }

  async function handleRejectRequest(id: string) {
    if (!session) return;
    const reason = window.prompt("Reason for rejecting this location request?") ?? undefined;
    try {
      await api.rejectLocationRequest(session.accessToken, id, reason);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject request");
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Drop Locations</h2>

      <div className="card">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="HQ Office" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="HQ" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as LocationType)}>
              {LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Pickup point type</label>
            <select value={pickupPointType} onChange={(e) => setPickupPointType(e.target.value as PickupPointType | "")}>
              <option value="">— none —</option>
              {PICKUP_POINT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy}>
            Add location
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>City</th>
              <th>Address</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) =>
              editingId === l.id ? (
                <tr key={l.id}>
                  <td>{l.code}</td>
                  <td>
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </td>
                  <td>
                    <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as LocationType })}>
                      {LOCATION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                  </td>
                  <td>
                    <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                  </td>
                  <td>
                    <span className="badge">{l.status}</span>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleSaveEdit(l.id)}>Save</button>
                    <button className="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={l.id}>
                  <td>{l.code}</td>
                  <td>{l.name}</td>
                  <td>{l.type ?? "OFFICE"}</td>
                  <td>{l.city ?? "—"}</td>
                  <td>{l.address ?? "—"}</td>
                  <td>
                    <span className="badge">{l.status}</span>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="secondary" onClick={() => startEdit(l)}>
                      Edit
                    </button>
                    {l.status === "ACTIVE" && (
                      <button className="secondary" onClick={() => handleRemove(l.id)}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
            {locations.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  No drop locations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Request a new location</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Anyone in the corporate can propose a location for approval — matches the employee self-service pattern
          used for signup requests.
        </p>
        <form onSubmit={handleRequestLocation} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input value={reqName} onChange={(e) => setReqName(e.target.value)} required placeholder="New satellite office" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>City</label>
            <input value={reqCity} onChange={(e) => setReqCity(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>Reason</label>
            <input value={reqReason} onChange={(e) => setReqReason(e.target.value)} placeholder="Why this location is needed" />
          </div>
          <button type="submit" disabled={busy}>
            Submit request
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pending location requests</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>Reason</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.context.name}</td>
                <td>{r.context.city ?? "—"}</td>
                <td>{r.context.reason ?? "—"}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleApproveRequest(r.id)}>Approve</button>
                  <button className="secondary" onClick={() => handleRejectRequest(r.id)}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No pending location requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
