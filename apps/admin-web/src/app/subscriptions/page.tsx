"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Organisation, SubscriptionPlan, Subscription, UsageRecord } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function SubscriptionsPage() {
  const { session } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [organisationId, setOrganisationId] = useState("");
  const [planId, setPlanId] = useState("");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [trialDays, setTrialDays] = useState("14");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    api.listOrganisations(session.accessToken).then((orgs) => {
      const active = orgs.filter((o) => o.status !== "PENDING_APPROVAL");
      setOrganisations(active);
      if (active.length > 0) setOrganisationId((prev) => prev || active[0].id);
    }).catch(() => {});
    api.listPlans(session.accessToken).then((list) => {
      setPlans(list);
      if (list.length > 0) setPlanId((prev) => prev || list[0].id);
    }).catch(() => {});
  }, [session]);

  function loadSubscription() {
    if (!session || !organisationId) return;
    setError(null);
    api
      .getSubscription(session.accessToken, organisationId)
      .then(setSubscription)
      .catch((err) => {
        setSubscription(null);
        if (err instanceof ApiError && err.status !== 404) setError(err.message);
      });
    api.listUsage(session.accessToken, organisationId).then(setUsage).catch(() => setUsage([]));
  }

  useEffect(loadSubscription, [session, organisationId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      loadSubscription();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const currentOrg = organisations.find((o) => o.id === organisationId);

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Subscriptions</h2>

      <div className="card">
        <div className="field">
          <label>Organisation</label>
          <select value={organisationId} onChange={(e) => setOrganisationId(e.target.value)}>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.displayName} ({o.globalOrgId}){o.status === "SUSPENDED" ? " — tenant suspended" : ""}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error-text">{error}</p>}
        {currentOrg?.status === "SUSPENDED" && (
          <p style={{ color: "var(--danger)", fontSize: 13 }}>
            This tenant is suspended (org-level, blocks login) — subscription status is independent of that.
          </p>
        )}

        {subscription ? (
          <>
            <p>
              Plan: <strong>{subscription.plan?.name ?? subscription.planId}</strong> — status{" "}
              <span className={`badge${subscription.status === "ACTIVE" ? " success" : subscription.status === "SUSPENDED" ? " danger" : ""}`}>
                {subscription.status}
              </span>
              {subscription.trialEndsAt && (
                <span style={{ color: "var(--text-muted)" }}> · trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}</span>
              )}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button disabled={busy} onClick={() => withBusy(() => api.activateSubscription(session!.accessToken, organisationId))}>
                Activate
              </button>
              <button className="secondary" disabled={busy} onClick={() => withBusy(() => api.resumeSubscription(session!.accessToken, organisationId))}>
                Resume
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => withBusy(() => api.suspendSubscription(session!.accessToken, organisationId))}
              >
                Suspend
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => withBusy(() => api.cancelSubscription(session!.accessToken, organisationId))}
              >
                Cancel
              </button>
              <span style={{ borderLeft: "1px solid var(--border)", height: 20, margin: "0 4px" }} />
              <input
                type="number"
                min={1}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                style={{ width: 70 }}
              />
              <button
                className="secondary"
                disabled={busy || !trialDays}
                onClick={() => withBusy(() => api.extendTrial(session!.accessToken, organisationId, Number(trialDays)))}
              >
                Extend trial (days)
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>This organisation has no subscription yet.</p>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
            <label>{subscription ? "Change plan (upgrade/downgrade)" : "Subscribe to plan"}</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.monthlyPriceCents ? ` — $${(p.monthlyPriceCents / 100).toFixed(0)}/mo` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            disabled={busy || !planId}
            onClick={() => withBusy(() => api.subscribe(session!.accessToken, organisationId, planId))}
          >
            {subscription ? "Change plan" : "Subscribe"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Usage metering (latest periods)</h3>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Metrics</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr key={u.id}>
                <td>
                  {new Date(u.periodStart).toLocaleDateString()} – {new Date(u.periodEnd).toLocaleDateString()}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {Object.entries(u.metrics)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </td>
              </tr>
            ))}
            {usage.length === 0 && (
              <tr>
                <td colSpan={2} style={{ color: "var(--text-muted)" }}>
                  No usage records for this organisation yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
