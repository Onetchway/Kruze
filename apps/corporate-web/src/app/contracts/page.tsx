"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, Contract, OrganisationRelationship, Zone } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const PRICING_MODELS = ["PER_KM", "PER_TRIP", "HYBRID", "SLAB"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function RateCardForm({
  contractId,
  zones,
  onCreated,
}: {
  contractId: string;
  zones: Zone[];
  onCreated: () => void;
}) {
  const { session } = useAuth();
  const [vehicleType, setVehicleType] = useState("SEDAN");
  const [zoneId, setZoneId] = useState("");
  const [pricingModel, setPricingModel] = useState("PER_KM");
  const [perKmRate, setPerKmRate] = useState("");
  const [perTripFlat, setPerTripFlat] = useState("");
  const [baseFare, setBaseFare] = useState("");
  const [capAmount, setCapAmount] = useState("");
  const [slabsJson, setSlabsJson] = useState('[{"minKm":0,"maxKm":10,"rate":300},{"minKm":10,"rate":500}]');
  const [minimumGuarantee, setMinimumGuarantee] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const pricingRules: Record<string, unknown> = {};
      if (perKmRate) pricingRules.perKmRate = Number(perKmRate);
      if (perTripFlat) pricingRules.perTripFlat = Number(perTripFlat);
      if (minimumGuarantee) pricingRules.minimumGuarantee = Number(minimumGuarantee);
      if (taxRatePercent) pricingRules.taxRatePercent = Number(taxRatePercent);
      if (pricingModel === "SLAB") {
        if (baseFare) pricingRules.baseFare = Number(baseFare);
        if (capAmount) pricingRules.capAmount = Number(capAmount);
        try {
          pricingRules.slabs = JSON.parse(slabsJson);
        } catch {
          throw new ApiError(400, "Slabs must be valid JSON, e.g. [{\"minKm\":0,\"maxKm\":10,\"rate\":300}]");
        }
      }

      await api.addRateCard(session.accessToken, contractId, {
        vehicleType,
        zoneId: zoneId || undefined,
        pricingModel,
        pricingRules,
        effectiveFrom,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add rate card");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ minWidth: 140 }}>
          <label>Vehicle type</label>
          <input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} required />
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label>Zone (optional)</label>
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">All zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: 140 }}>
          <label>Pricing model</label>
          <select value={pricingModel} onChange={(e) => setPricingModel(e.target.value)}>
            {PRICING_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: 140 }}>
          <label>Effective from</label>
          <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
        </div>
      </div>

      {(pricingModel === "PER_KM" || pricingModel === "HYBRID") && (
        <div className="field" style={{ maxWidth: 200 }}>
          <label>Per-km rate</label>
          <input type="number" value={perKmRate} onChange={(e) => setPerKmRate(e.target.value)} />
        </div>
      )}
      {(pricingModel === "PER_TRIP" || pricingModel === "HYBRID") && (
        <div className="field" style={{ maxWidth: 200 }}>
          <label>Per-trip flat</label>
          <input type="number" value={perTripFlat} onChange={(e) => setPerTripFlat(e.target.value)} />
        </div>
      )}
      {pricingModel === "SLAB" && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ maxWidth: 200 }}>
              <label>Base fare</label>
              <input type="number" value={baseFare} onChange={(e) => setBaseFare(e.target.value)} />
            </div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label>Cap amount (optional)</label>
              <input type="number" value={capAmount} onChange={(e) => setCapAmount(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Slabs (JSON: minKm/maxKm/rate)</label>
            <input value={slabsJson} onChange={(e) => setSlabsJson(e.target.value)} />
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ maxWidth: 200 }}>
          <label>Minimum guarantee (optional)</label>
          <input type="number" value={minimumGuarantee} onChange={(e) => setMinimumGuarantee(e.target.value)} />
        </div>
        <div className="field" style={{ maxWidth: 200 }}>
          <label>Tax rate % (optional)</label>
          <input type="number" value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)} />
        </div>
      </div>

      <button type="submit" disabled={busy}>
        Add rate card
      </button>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}

export default function ContractsPage() {
  const { session } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [relationships, setRelationships] = useState<OrganisationRelationship[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [vendorOrgId, setVendorOrgId] = useState("");
  const [startsAt, setStartsAt] = useState(todayIso());
  const [slaTargetPercent, setSlaTargetPercent] = useState("95");
  const [penaltyDescription, setPenaltyDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api.listContracts(session.accessToken).then(setContracts).catch(() => {});
    api.listRelationships(session.accessToken).then((rels) => {
      const vendors = rels.filter((r) => r.type === "CORPORATE_VENDOR" && r.status === "ACTIVE");
      setRelationships(vendors);
      if (vendors.length > 0) {
        setVendorOrgId((prev) => prev || (vendors[0].sourceOrgId === session.organisationId ? vendors[0].targetOrgId : vendors[0].sourceOrgId));
      }
    }).catch(() => {});
    api.listZones(session.accessToken).then(setZones).catch(() => {});
  }

  useEffect(reload, [session]);

  const vendorName = useMemo(() => {
    const map = new Map<string, string>();
    for (const rel of relationships) {
      const counterpart = rel.sourceOrgId === session?.organisationId ? rel.targetOrg : rel.sourceOrg;
      map.set(counterpart.id, counterpart.displayName);
    }
    return (id: string) => map.get(id) ?? id;
  }, [relationships, session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !vendorOrgId) return;
    setBusy(true);
    setError(null);
    try {
      await api.createContract(session.accessToken, {
        vendorOrgId,
        startsAt,
        slaTargets: {
          targetPercent: slaTargetPercent ? Number(slaTargetPercent) : undefined,
          penaltyDescription: penaltyDescription || undefined,
        },
      });
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create contract");
    } finally {
      setBusy(false);
    }
  }

  async function handleActivate(id: string) {
    if (!session) return;
    try {
      await api.activateContract(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to activate contract");
    }
  }

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>Contracts &amp; Rate Cards</h2>

      <div className="card">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>Vendor</label>
            <select value={vendorOrgId} onChange={(e) => setVendorOrgId(e.target.value)}>
              {relationships.map((rel) => {
                const counterpart = rel.sourceOrgId === session?.organisationId ? rel.targetOrg : rel.sourceOrg;
                return (
                  <option key={counterpart.id} value={counterpart.id}>
                    {counterpart.displayName}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Starts</label>
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0, maxWidth: 120 }}>
            <label>SLA target %</label>
            <input type="number" min={0} max={100} value={slaTargetPercent} onChange={(e) => setSlaTargetPercent(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
            <label>Penalty (optional)</label>
            <input value={penaltyDescription} onChange={(e) => setPenaltyDescription(e.target.value)} placeholder="e.g. 1% credit per point below SLA" />
          </div>
          <button type="submit" disabled={busy || !vendorOrgId}>
            Create contract
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
        {relationships.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Connect a vendor on the My Fleet page first — a contract needs an active vendor relationship.
          </p>
        )}
      </div>

      {contracts.map((c) => (
        <div className="card" key={c.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{vendorName(c.vendorOrgId)}</strong>{" "}
              <span className="badge">{c.status}</span>
              {c.slaTargets?.targetPercent != null && (
                <span style={{ marginLeft: 12, fontSize: 13, color: "var(--text-muted)" }}>
                  SLA {c.slaTargets.targetPercent}%
                  {c.slaTargets.penaltyDescription ? ` · Penalty: ${c.slaTargets.penaltyDescription}` : ""}
                </span>
              )}
            </div>
            <div>
              {c.status === "DRAFT" && <button onClick={() => handleActivate(c.id)}>Activate</button>}
              <button className="secondary" style={{ marginLeft: 8 }} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                {expanded === c.id ? "Hide rate cards" : `Rate cards (${c.rateCards.length})`}
              </button>
            </div>
          </div>

          {expanded === c.id && (
            <>
              <table style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Vehicle type</th>
                    <th>Zone</th>
                    <th>Model</th>
                    <th>Effective from</th>
                    <th>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {c.rateCards.map((rc) => (
                    <tr key={rc.id}>
                      <td>{rc.vehicleType}</td>
                      <td>{rc.zoneId ? zones.find((z) => z.id === rc.zoneId)?.name ?? rc.zoneId : "All zones"}</td>
                      <td>{rc.pricingModel}</td>
                      <td>{new Date(rc.effectiveFrom).toLocaleDateString()}</td>
                      <td>{rc.version}</td>
                    </tr>
                  ))}
                  {c.rateCards.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                        No rate cards yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <RateCardForm contractId={c.id} zones={zones} onCreated={reload} />
            </>
          )}
        </div>
      ))}
      {contracts.length === 0 && (
        <div className="card">
          <p style={{ color: "var(--text-muted)", margin: 0 }}>No contracts yet.</p>
        </div>
      )}
    </ProtectedShell>
  );
}
