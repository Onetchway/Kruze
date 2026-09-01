"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Incident, SafetyPolicy } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const RULE_TYPES = [
  { value: "LAST_DROP_RESTRICTION", label: "Last-drop restriction (no lone female as final passenger after night-start)" },
  { value: "GUARD_REQUIRED", label: "Mandatory guard/escort" },
  { value: "MAX_RIDE_TIME", label: "Maximum ride time" },
];

function severityClass(sev: string) {
  if (sev === "CRITICAL" || sev === "HIGH") return "warning";
  return "";
}

export default function SafetyPage() {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
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
    api.listIncidents(session.accessToken).then(setIncidents).catch(() => {});
    api.listSafetyPolicies(session.accessToken).then((list) => {
      setPolicies(list);
      setSelectedPolicyId((prev) => prev || list[0]?.id || "");
    }).catch(() => {});
  }

  useEffect(reload, [session]);

  const openIncidents = incidents.filter((i) => i.status !== "CLOSED");
  const sosIncidents = openIncidents.filter((i) => i.category === "SOS");

  async function handleClose(id: string) {
    if (!session) return;
    const correctiveAction = window.prompt("Corrective action taken?");
    if (!correctiveAction) return;
    try {
      await api.closeIncident(session.accessToken, id, correctiveAction);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to close incident");
    }
  }

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

  return (
    <ProtectedShell
      title="Safety"
      subtitle="Live SOS/incident monitoring and configurable safety policies (Female Safety, guard/escort, ride-time limits)."
    >
      <div className="stat-row">
        <div className={`stat-tile ${sosIncidents.length > 0 ? "warning" : ""}`}>
          <div className="value">{sosIncidents.length}</div>
          <div className="label">Active SOS</div>
        </div>
        <div className={`stat-tile ${openIncidents.length > 0 ? "warning" : ""}`}>
          <div className="value">{openIncidents.length}</div>
          <div className="label">Open incidents</div>
        </div>
        <div className="stat-tile">
          <div className="value">{policies.filter((p) => p.active).length}</div>
          <div className="label">Active safety policies</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Live Safety — open incidents &amp; SOS</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Severity</th>
              <th>Description</th>
              <th>Raised</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {openIncidents.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className="badge">{i.category}</span>
                </td>
                <td className={severityClass(i.severity)}>{i.severity}</td>
                <td>{i.description ?? "—"}</td>
                <td>{new Date(i.createdAt).toLocaleString()}</td>
                <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="secondary" disabled title="Stub — no telephony integration configured">
                    Call driver
                  </button>
                  <button className="secondary" disabled title="Stub — no telephony integration configured">
                    Contact guard
                  </button>
                  <button onClick={() => handleClose(i.id)}>Close</button>
                </td>
              </tr>
            ))}
            {openIncidents.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  No open incidents. All clear.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Safety policies</h3>
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
                  <input
                    type="number"
                    value={maxRideMinutes}
                    onChange={(e) => setMaxRideMinutes(Number(e.target.value))}
                  />
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
