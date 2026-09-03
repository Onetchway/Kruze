"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, PlanningWeights } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const FIELDS: { key: keyof PlanningWeights; label: string }[] = [
  { key: "safety", label: "Safety" },
  { key: "onTime", label: "On-time" },
  { key: "rideTime", label: "Ride-time" },
  { key: "utilization", label: "Utilization" },
  { key: "cost", label: "Cost" },
  { key: "routeStability", label: "Route stability" },
];

export default function PlanningPage() {
  const { session } = useAuth();
  const [weights, setWeights] = useState<PlanningWeights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    api.getPlanningWeights(session.accessToken).then(setWeights).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [session]);

  function setField(key: keyof PlanningWeights, value: number) {
    setWeights((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!session || !weights) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.setPlanningWeights(session.accessToken, weights);
      setWeights(saved);
      setNotice("Saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const total = weights ? FIELDS.reduce((sum, f) => sum + (weights[f.key] ?? 0), 0) : 0;

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Planning & Automation</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Optimisation objective weights used to describe how route planning should balance competing goals. This is a
        config surface only — the CVRP solver (apps/optimizer-service) does not yet accept weight parameters, so
        saving here does not re-tune route generation until that integration exists.
      </p>

      {error && <p className="error-text">{error}</p>}
      {notice && <p style={{ color: "var(--success)", fontSize: 13 }}>{notice}</p>}

      {weights && (
        <div className="card" style={{ maxWidth: 480 }}>
          {FIELDS.map((f) => (
            <div key={f.key} className="field" style={{ marginBottom: 10 }}>
              <label>
                {f.label} ({weights[f.key]})
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={weights[f.key]}
                onChange={(e) => setField(f.key, Number(e.target.value))}
              />
            </div>
          ))}
          <p style={{ color: total === 100 ? "var(--text-muted)" : "var(--warning)", fontSize: 13 }}>
            Total: {total} {total !== 100 && "(weights are relative — needn't sum to 100, shown for reference)"}
          </p>
          <button disabled={busy} onClick={save}>
            Save weights
          </button>
        </div>
      )}
    </ProtectedShell>
  );
}
