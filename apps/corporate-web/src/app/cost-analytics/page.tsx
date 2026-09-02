"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, CostAnalytics } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

export default function CostAnalyticsPage() {
  const { session } = useAuth();
  const [cost, setCost] = useState<CostAnalytics | null>(null);

  useEffect(() => {
    if (!session) return;
    api.costAnalytics(session.accessToken).then(setCost).catch(() => {});
  }, [session]);

  return (
    <ProtectedShell title="Cost Analytics" subtitle="Cost-per-employee and cost-per-km, with a breakdown by vehicle type — over the last 30 days.">
      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">₹{(cost?.costPerEmployee ?? 0).toFixed(0)}</div>
          <div className="label">Cost per employee</div>
        </div>
        <div className="stat-tile">
          <div className="value">{cost?.costPerKm != null ? `₹${cost.costPerKm.toFixed(2)}` : "—"}</div>
          <div className="label">Cost per km</div>
        </div>
        <div className="stat-tile">
          <div className="value">₹{(cost?.totalCorporateCost ?? 0).toFixed(0)}</div>
          <div className="label">Total corporate cost</div>
        </div>
        <div className="stat-tile">
          <div className="value">{(cost?.totalDistanceKm ?? 0).toFixed(0)} km</div>
          <div className="label">Total distance</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Cost by vehicle type</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Total corporate cost allocated proportionally to each vehicle type&apos;s share of trip assignments — an
          approximation, since cost isn&apos;t recorded per-assignment.
        </p>
        {cost && Object.keys(cost.costByVehicleType).length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Vehicle type</th>
                <th>Allocated cost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cost.costByVehicleType).map(([type, amount]) => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>₹{amount.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>No vehicle assignments in range yet.</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Empty-km</h3>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          Not available — Trip records only total distance, not the pickup-leg vs. loaded-leg split needed to compute
          empty-km. Would require planned-path/leg-level distance tracking, not yet implemented.
        </p>
      </div>
    </ProtectedShell>
  );
}
