"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Employee, TripDetail } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function EmployeeDetailPage() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [currentTrip, setCurrentTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session || !params.id) return;
    api.getEmployee(session.accessToken, params.id).then(setEmployee).catch((err) => {
      setError(err instanceof ApiError ? err.message : "Failed to load employee");
    });
    api.employeeCurrentTrip(session.accessToken, params.id).then(setCurrentTrip).catch(() => setCurrentTrip(null));
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

  if (!employee) {
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
          <div className="label">Transport</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Profile</h3>
        <table>
          <tbody>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Phone</td>
              <td>{employee.phone}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Email</td>
              <td>{employee.email ?? "—"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Office</td>
              <td>{employee.officeLabel ?? "—"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Cost centre</td>
              <td>{employee.costCentre ?? "—"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Gender</td>
              <td>{employee.gender ?? "Not declared"}</td>
            </tr>
          </tbody>
        </table>
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
        <h3 style={{ marginTop: 0 }}>Transport controls</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Disabling transport removes this employee from future auto-plan demand until re-enabled. Pickup location and
          shift changes are made from the Employees list; the vendor-owned driver record itself is never editable here.
        </p>
        <button onClick={handleToggleTransport} disabled={busy}>
          {employee.status === "ACTIVE" ? "Disable transport" : "Enable transport"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </ProtectedShell>
  );
}
