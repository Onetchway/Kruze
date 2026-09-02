"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, SafetyPolicy } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const RULE_TYPES = [
  { value: "LAST_DROP_RESTRICTION", label: "Last-drop restriction (no lone female as final passenger after night-start)" },
  { value: "GUARD_REQUIRED", label: "Mandatory guard/escort" },
  { value: "MAX_RIDE_TIME", label: "Maximum ride time" },
];

export default function FemaleSafetyPage() {
  const { session } = useAuth();
  const [policies, setPolicies] = useState<SafetyPolicy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [policyName, setPolicyName] = useState("Female Safety Policy");
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [ruleType, setRuleType] = useState(RULE_TYPES[0].value);
  const [nightStart, setNightStart] = useState("20:00");
  const [maxRideMinutes, setMaxRideMinutes] = useState(45);
  const [mandatory, setMandatory] = useState(true);
  const [busy, setBusy] = useState(false);

  function reload() {
    if (!session) return;
    api.listSafetyPolicies(session.accessToken).then((list) => {
      setPolicies(list);
      setSelectedPolicyId((prev) => prev || list[0]?.id || "");
    }).catch(() => {});
  }

  useEffect(reload, [session]);

  async function handleCreatePolicy() {
    if (!session || !policyName) return;
    setBusy(true);
    setError(null);
    try {
      const policy = await api.createSafetyPolicy(session.accessToken, policyName);
      setMessage(`Created policy "${policy.name}" — now add rules to it below.`);
      reload();
      setSelectedPolicyId(policy.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create policy");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddRule() {
    if (!session || !selectedPolicyId) return;
    setBusy(true);
    setError(null);
    try {
      const config: Record<string, unknown> =
        ruleType === "LAST_DROP_RESTRICTION"
          ? { nightStartTime: nightStart, requiresGuardAfterNightStart: true }
          : ruleType === "MAX_RIDE_TIME"
            ? { maxMinutes: maxRideMinutes }
            : { requiresGuard: true };
      await api.addSafetyRule(session.accessToken, selectedPolicyId, { type: ruleType, config, mandatory });
      setMessage("Rule added.");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add rule");
    } finally {
      setBusy(false);
    }
  }

  const nightRule = policies.flatMap((p) => p.rules).find((r) => r.type === "LAST_DROP_RESTRICTION");
  const guardRule = policies.flatMap((p) => p.rules).find((r) => r.type === "GUARD_REQUIRED");
  const rideRule = policies.flatMap((p) => p.rules).find((r) => r.type === "MAX_RIDE_TIME");

  return (
    <ProtectedShell
      title="Female Safety Policy"
      subtitle="Night-start, last-drop restriction, mandatory guard, and ride-time limits — enforced as hard constraints in auto-planning."
    >
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Current policy summary</h3>
        <table>
          <tbody>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Night begins</td>
              <td>{(nightRule?.config as { nightStartTime?: string })?.nightStartTime ?? "Not configured"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Last-drop restriction</td>
              <td>{nightRule ? "Restricted ✓" : "Not configured"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Guard required</td>
              <td>{guardRule ? "Yes" : "Not configured"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Maximum ride time</td>
              <td>{(rideRule?.config as { maxMinutes?: number })?.maxMinutes ? `${(rideRule?.config as { maxMinutes?: number }).maxMinutes} min` : "Not configured"}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--text-muted)" }}>Emergency escalation</td>
              <td>Guard → Transport Admin → SOS (see Safety → SOS)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Configure</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>New policy name</label>
            <input value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="Female Safety Policy" />
          </div>
          <button onClick={handleCreatePolicy} disabled={busy || !policyName}>
            Create policy
          </button>
        </div>

        {policies.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
                <label>Policy</label>
                <select value={selectedPolicyId} onChange={(e) => setSelectedPolicyId(e.target.value)}>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (v{p.version})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, minWidth: 260 }}>
                <label>Rule type</label>
                <select value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
                  {RULE_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {ruleType === "LAST_DROP_RESTRICTION" && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Night-start time</label>
                  <input value={nightStart} onChange={(e) => setNightStart(e.target.value)} placeholder="20:00" />
                </div>
              )}
              {ruleType === "MAX_RIDE_TIME" && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Max ride time (min)</label>
                  <input type="number" value={maxRideMinutes} onChange={(e) => setMaxRideMinutes(Number(e.target.value))} />
                </div>
              )}
              <div className="field" style={{ marginBottom: 0 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={mandatory}
                    onChange={(e) => setMandatory(e.target.checked)}
                    style={{ width: "auto", marginRight: 6, verticalAlign: "middle" }}
                  />
                  Mandatory (hard-blocks planning)
                </label>
              </div>
              <button onClick={handleAddRule} disabled={busy || !selectedPolicyId}>
                Add rule
              </button>
            </div>

            <table style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Rule</th>
                  <th>Mandatory</th>
                  <th>Config</th>
                </tr>
              </thead>
              <tbody>
                {policies.flatMap((p) =>
                  p.rules.map((r) => (
                    <tr key={r.id}>
                      <td>{p.name}</td>
                      <td>{r.type.replaceAll("_", " ")}</td>
                      <td>
                        <span className="badge">{r.mandatory ? "Mandatory" : "Advisory"}</span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{JSON.stringify(r.config)}</td>
                    </tr>
                  )),
                )}
                {policies.every((p) => p.rules.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                      No rules configured yet — add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
        {error && <p className="error-text">{error}</p>}
        {message && <p style={{ color: "var(--success)", fontSize: 13, marginTop: 8 }}>{message}</p>}
      </div>
    </ProtectedShell>
  );
}
