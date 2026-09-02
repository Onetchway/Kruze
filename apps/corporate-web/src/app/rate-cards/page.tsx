"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, RateCard, Zone } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

type RateCardRow = RateCard & { contract: { id: string; vendorOrgId: string; status: string }; zone: Zone | null };

export default function RateCardsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<RateCardRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ pricingModel: string; pricingRulesJson: string; effectiveFrom: string; effectiveTo: string }>({
    pricingModel: "",
    pricingRulesJson: "{}",
    effectiveFrom: "",
    effectiveTo: "",
  });

  function reload() {
    if (!session) return;
    api.listRateCards(session.accessToken).then(setRows).catch(() => {});
  }

  useEffect(reload, [session]);

  function startEdit(rc: RateCardRow) {
    setEditingId(rc.id);
    setEditForm({
      pricingModel: rc.pricingModel,
      pricingRulesJson: JSON.stringify(rc.pricingRules, null, 0),
      effectiveFrom: rc.effectiveFrom.slice(0, 10),
      effectiveTo: rc.effectiveTo ? rc.effectiveTo.slice(0, 10) : "",
    });
  }

  async function handleSaveEdit() {
    if (!session || !editingId) return;
    setError(null);
    try {
      let pricingRules: Record<string, unknown>;
      try {
        pricingRules = JSON.parse(editForm.pricingRulesJson);
      } catch {
        throw new ApiError(400, "Pricing rules must be valid JSON");
      }
      await api.updateRateCard(session.accessToken, editingId, {
        pricingModel: editForm.pricingModel,
        pricingRules,
        effectiveFrom: editForm.effectiveFrom || undefined,
        effectiveTo: editForm.effectiveTo || undefined,
      });
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update rate card");
    }
  }

  async function handleRemove(id: string) {
    if (!session) return;
    try {
      await api.removeRateCard(session.accessToken, id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove rate card");
    }
  }

  const active = rows.filter((r) => !r.effectiveTo || new Date(r.effectiveTo) > new Date());

  return (
    <ProtectedShell
      title="Rate Cards"
      subtitle="Every vendor/vehicle-type rate card across all contracts, promoted to its own screen. Editing closes the current version and opens a new one — rate cards are always versioned, never overwritten."
    >
      <div className="card">
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Vehicle type</th>
              <th>Zone</th>
              <th>Model</th>
              <th>Pricing rules</th>
              <th>Effective from</th>
              <th>Effective to</th>
              <th>Version</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {active.map((rc) =>
              editingId === rc.id ? (
                <tr key={rc.id}>
                  <td>{rc.vehicleType}</td>
                  <td>{rc.zone?.name ?? "All zones"}</td>
                  <td>
                    <input value={editForm.pricingModel} onChange={(e) => setEditForm({ ...editForm, pricingModel: e.target.value })} style={{ width: 100 }} />
                  </td>
                  <td>
                    <input
                      value={editForm.pricingRulesJson}
                      onChange={(e) => setEditForm({ ...editForm, pricingRulesJson: e.target.value })}
                      style={{ minWidth: 220 }}
                    />
                  </td>
                  <td>
                    <input type="date" value={editForm.effectiveFrom} onChange={(e) => setEditForm({ ...editForm, effectiveFrom: e.target.value })} />
                  </td>
                  <td>
                    <input type="date" value={editForm.effectiveTo} onChange={(e) => setEditForm({ ...editForm, effectiveTo: e.target.value })} />
                  </td>
                  <td>{rc.version}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button onClick={handleSaveEdit}>Save</button>
                    <button className="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={rc.id}>
                  <td>{rc.vehicleType}</td>
                  <td>{rc.zone?.name ?? "All zones"}</td>
                  <td>{rc.pricingModel}</td>
                  <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {JSON.stringify(rc.pricingRules)}
                  </td>
                  <td>{new Date(rc.effectiveFrom).toLocaleDateString()}</td>
                  <td>{rc.effectiveTo ? new Date(rc.effectiveTo).toLocaleDateString() : "—"}</td>
                  <td>{rc.version}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="secondary" onClick={() => startEdit(rc)}>
                      Edit
                    </button>
                    <button className="secondary" onClick={() => handleRemove(rc.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
            {active.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  No active rate cards yet — add one from a contract on the Contracts page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    </ProtectedShell>
  );
}
