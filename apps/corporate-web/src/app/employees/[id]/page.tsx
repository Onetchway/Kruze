"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Employee, TripDetail, Trip, Location, Shift } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const REQUIREMENT_OPTIONS = ["WHEELCHAIR_ACCESS", "NIGHT_SHIFT_ESCORT", "MEDICAL_ATTENTION", "PREGNANCY_SAFETY"];

export default function EmployeeDetailPage() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [currentTrip, setCurrentTrip] = useState<TripDetail | null>(null);
  const [history, setHistory] = useState<Trip[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Editable profile form state
  const [form, setForm] = useState<{
    fullName: string;
    phone: string;
    email: string;
    department: string;
    costCentre: string;
    officeLabel: string;
    shiftId: string;
    pickupLocationId: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    specialRequirements: string[];
  } | null>(null);

  function reload() {
    if (!session || !params.id) return;
    api.getEmployee(session.accessToken, params.id).then((e) => {
      setEmployee(e);
      setForm({
        fullName: e.fullName,
        phone: e.phone,
        email: e.email ?? "",
        department: e.department ?? "",
        costCentre: e.costCentre ?? "",
        officeLabel: e.officeLabel ?? "",
        shiftId: e.shiftId ?? "",
        pickupLocationId: e.pickupLocationId ?? "",
        emergencyContactName: e.emergencyContactName ?? "",
        emergencyContactPhone: e.emergencyContactPhone ?? "",
        specialRequirements: e.specialRequirements ?? [],
      });
    }).catch((err) => {
      setError(err instanceof ApiError ? err.message : "Failed to load employee");
    });
    api.employeeCurrentTrip(session.accessToken, params.id).then(setCurrentTrip).catch(() => setCurrentTrip(null));
    api.employeeTripHistory(session.accessToken, params.id).then(setHistory).catch(() => setHistory([]));
    api.listLocations(session.accessToken).then(setLocations).catch(() => {});
    api.listShifts(session.accessToken).then(setShifts).catch(() => {});
  }

  useEffect(reload, [session, params.id]);

  async function handleToggleTransport() {
    if (!session || !employee) return;
    setBusy(true);
    setError(null);
    try {
      if (employee.status === "ACTIVE") {
        await api.deactivateEmployee(session.accessToken, employee.id);
      } else {
        await api.reactivateEmployee(session.accessToken, employee.id);
      }
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update transport status");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveTransport(eligible: boolean) {
    if (!session || !employee) return;
    setBusy(true);
    setError(null);
    try {
      const reason = eligible ? undefined : window.prompt("Reason for ineligibility (e.g. outside transport zone)?") ?? undefined;
      await api.approveEmployeeTransport(session.accessToken, employee.id, { transportEligible: eligible, eligibilityReason: reason });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update transport eligibility");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !employee || !form) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.updateEmployee(session.accessToken, employee.id, {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        department: form.department || undefined,
        costCentre: form.costCentre || undefined,
        officeLabel: form.officeLabel || undefined,
        shiftId: form.shiftId || undefined,
        pickupLocationId: form.pickupLocationId || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        specialRequirements: form.specialRequirements,
      });
      setMessage("Profile updated.");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setBusy(false);
    }
  }

  function toggleRequirement(req: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            specialRequirements: prev.specialRequirements.includes(req)
              ? prev.specialRequirements.filter((r) => r !== req)
              : [...prev.specialRequirements, req],
          }
        : prev,
    );
  }

  if (!employee || !form) {
    return (
      <ProtectedShell title="Employee">
        {error ? <p className="error-text">{error}</p> : <p style={{ color: "var(--text-muted)" }}>Loading…</p>}
      </ProtectedShell>
    );
  }

  const activeAssignment = currentTrip?.assignments?.[0];

  return (
    <ProtectedShell>
      <button className="secondary" onClick={() => router.push("/employees")} style={{ marginBottom: 16 }}>
        ← Back to Employees
      </button>
      <h2 style={{ marginTop: 0 }}>{employee.fullName}</h2>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{employee.employeeCode}</div>
          <div className="label">Employee ID</div>
        </div>
        <div className="stat-tile">
          <div className="value">{employee.department ?? "—"}</div>
          <div className="label">Department</div>
        </div>
        <div className="stat-tile">
          <div className="value">{employee.shift?.name ?? "—"}</div>
          <div className="label">Shift</div>
        </div>
        <div className={`stat-tile ${employee.status === "ACTIVE" ? "" : "warning"}`}>
          <div className="value">{employee.status === "ACTIVE" ? "ACTIVE" : "DISABLED"}</div>
          <div className="label">Account</div>
        </div>
        <div className={`stat-tile ${employee.transportEligible === false ? "warning" : ""}`}>
          <div className="value">{employee.transportEligible === false ? "NOT ELIGIBLE" : "ELIGIBLE"}</div>
          <div className="label">Transport eligibility</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Profile</h3>
        <form onSubmit={handleSaveProfile} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Full name</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Department</label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div className="field">
            <label>Cost centre</label>
            <input value={form.costCentre} onChange={(e) => setForm({ ...form, costCentre: e.target.value })} />
          </div>
          <div className="field">
            <label>Office label</label>
            <input value={form.officeLabel} onChange={(e) => setForm({ ...form, officeLabel: e.target.value })} />
          </div>
          <div className="field">
            <label>Shift</label>
            <select value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: e.target.value })}>
              <option value="">None</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Pickup location</label>
            <select value={form.pickupLocationId} onChange={(e) => setForm({ ...form, pickupLocationId: e.target.value })}>
              <option value="">None</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Gender</label>
            <input value={employee.gender ?? "Not declared"} disabled />
          </div>
          <div />

          <div className="field">
            <label>Emergency contact name</label>
            <input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
          </div>
          <div className="field">
            <label>Emergency contact phone</label>
            <input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Special transport requirements
            </label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {REQUIREMENT_OPTIONS.map((req) => (
                <label key={req} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={form.specialRequirements.includes(req)}
                    onChange={() => toggleRequirement(req)}
                  />
                  {req.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
        {message && <p style={{ color: "var(--success)", fontSize: 13 }}>{message}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Current trip</h3>
        {currentTrip ? (
          <table>
            <tbody>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Trip</td>
                <td>
                  <a href={`/trips/${currentTrip.id}`}>{currentTrip.globalTripId}</a>
                </td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Status</td>
                <td>
                  <span className="badge">{currentTrip.status}</span>
                </td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Vehicle</td>
                <td>{activeAssignment?.vehicle?.registrationNo ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Driver</td>
                <td>{activeAssignment?.driver?.fullName ?? "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-muted)" }}>Vendor</td>
                <td>{currentTrip.vendorOrg?.displayName ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>No trip booked for today.</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Booking / trip history</h3>
        {history.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No past trips recorded.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Trip</th>
                <th>Shift</th>
                <th>Status</th>
                <th>Scheduled start</th>
                <th>Vendor</th>
              </tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id}>
                  <td>
                    <a href={`/trips/${t.id}`}>{t.globalTripId}</a>
                  </td>
                  <td>{t.shift?.name ?? "—"}</td>
                  <td>
                    <span className="badge">{t.status.replaceAll("_", " ")}</span>
                  </td>
                  <td>{new Date(t.scheduledStartAt).toLocaleString()}</td>
                  <td>{t.vendorOrg?.displayName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Transport controls</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Disabling transport removes this employee from future auto-plan demand until re-enabled. Transport
          eligibility (distance/zone) is a separate corporate decision from whether the account itself is active —
          approve or deny it independently below.
        </p>
        {employee.eligibilityReason && (
          <p style={{ fontSize: 13 }}>
            <strong>Eligibility reason:</strong> {employee.eligibilityReason}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleToggleTransport} disabled={busy}>
            {employee.status === "ACTIVE" ? "Disable account" : "Enable account"}
          </button>
          <button className="secondary" onClick={() => handleApproveTransport(true)} disabled={busy || employee.transportEligible !== false}>
            Approve transport
          </button>
          <button className="secondary" onClick={() => handleApproveTransport(false)} disabled={busy || employee.transportEligible === false}>
            Revoke transport eligibility
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    </ProtectedShell>
  );
}
