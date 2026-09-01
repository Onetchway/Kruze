"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Employee } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function SignupRequestsPage() {
  const { session } = useAuth();
  const [pending, setPending] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});

  function reload() {
    if (!session) return;
    api.listPendingEmployees(session.accessToken).then(setPending).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleApprove(id: string) {
    if (!session) return;
    setError(null);
    try {
      await api.approveEmployeeSignup(session.accessToken, id, codeDrafts[id] || undefined);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    }
  }

  async function handleReject(id: string) {
    if (!session) return;
    setError(null);
    try {
      await api.rejectEmployeeSignup(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject");
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Signup Requests</h2>
      <div className="card">
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          Employees who requested transport access using this organisation&rsquo;s Kruze ID. Approving sets them
          active; you may replace the auto-generated code with your own employee code first.
        </p>
        {error && <p className="error-text">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Department</th>
              <th>Employee code</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((e) => (
              <tr key={e.id}>
                <td>{e.fullName}</td>
                <td>{e.phone}</td>
                <td>{e.department ?? "—"}</td>
                <td>
                  <input
                    value={codeDrafts[e.id] ?? e.employeeCode}
                    onChange={(ev) => setCodeDrafts((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                    style={{ width: 140 }}
                  />
                </td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleApprove(e.id)}>Approve</button>
                  <button className="secondary" onClick={() => handleReject(e.id)}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No pending signup requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
