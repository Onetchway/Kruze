"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, SubscriptionPlan } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function PlansPage() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [features, setFeatures] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listPlans(session.accessToken).then(setPlans).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const featureList = features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      await api.createPlan(session.accessToken, {
        code,
        name,
        features: featureList,
        monthlyPriceCents: monthlyPrice ? Math.round(Number(monthlyPrice) * 100) : undefined,
      });
      setCode("");
      setName("");
      setFeatures("");
      setMonthlyPrice("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>SaaS Plans & Billing</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Platform-wide plan catalogue. Per-tenant subscription actions (upgrade/downgrade/extend-trial/suspend) live on
        each organisation's <a href="/organisations">detail page →</a>.
      </p>
      <p style={{ color: "var(--text-muted)" }}>
        A plan is a named bundle of feature keys — entitlements are feature-based, never hard-coded by organisation
        type.
      </p>

      <div className="card">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="STANDARD" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Standard" />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 260 }}>
            <label>Feature keys (comma-separated)</label>
            <input value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="planning,billing,ev" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Monthly price ($)</label>
            <input value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} type="number" min={0} placeholder="499" />
          </div>
          <button type="submit" disabled={busy}>
            Create plan
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Price/mo</th>
              <th>Features</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{p.monthlyPriceCents ? `$${(p.monthlyPriceCents / 100).toFixed(0)}` : "—"}</td>
                <td>{p.features.join(", ")}</td>
                <td>
                  <span className={`badge${p.active ? " success" : ""}`}>{p.active ? "Active" : "Inactive"}</span>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No plans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
