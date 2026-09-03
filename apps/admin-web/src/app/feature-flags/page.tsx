"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, FeatureFlag } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function FeatureFlagsPage() {
  const { session } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listFeatureFlags(session.accessToken).then(setFlags).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load flags"));
  }

  useEffect(reload, [session]);

  async function toggle(flag: FeatureFlag) {
    if (!session) return;
    setBusyId(flag.id);
    setError(null);
    try {
      await api.toggleFeatureFlag(session.accessToken, flag.id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to toggle flag");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Feature Flags</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Simple on/off flags (spec §62) — no percentage rollout, no scheduled activation. This is a visibility/toggle
        surface only: flipping a flag here does not gate any behaviour elsewhere in the platform yet, so treat it as
        a record of intent rather than an active kill-switch until a future pass wires each flag into its module.
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Description</th>
              <th>Scope</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.id}>
                <td>
                  <strong>{f.name}</strong>
                  <div className="mono" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {f.key}
                  </div>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{f.description ?? "—"}</td>
                <td>
                  <span className="badge">{f.scope}</span>
                </td>
                <td>
                  <span className={`badge${f.enabled ? " success" : ""}`}>{f.enabled ? "Enabled" : "Disabled"}</span>
                </td>
                <td>
                  <button disabled={busyId === f.id} className={f.enabled ? "secondary" : undefined} onClick={() => toggle(f)}>
                    {f.enabled ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {flags.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No flags yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
