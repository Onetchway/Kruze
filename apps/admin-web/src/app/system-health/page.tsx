"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, PlatformDashboardOverview } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const KNOWN_SERVICES = [
  { name: "API (NestJS)", note: "REST API serving corporate-web/admin-web/control-room-web/operator-web" },
  { name: "PostgreSQL", note: "Primary datastore (Prisma)" },
  { name: "Kafka event bus", note: "Async fan-out for domain events (KafkaProducerService/KafkaConsumerService)" },
  { name: "Realtime gateway", note: "WebSocket channel for live tracking/dispatch updates" },
];

export default function SystemHealthPage() {
  const { session } = useAuth();
  const [data, setData] = useState<PlatformDashboardOverview | null>(null);

  useEffect(() => {
    if (!session) return;
    api.getDashboard(session.accessToken).then(setData).catch(() => {});
  }, [session]);

  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0 }}>System Health</h2>
      <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
        A known-services status page, deliberately kept simple — live service pings, a background-job monitor and an
        event-processing visualizer are out of scope for this pass. Event throughput below is a real count, not a
        simulated one.
      </p>

      {data && (
        <div className="stat-row">
          <div className="stat-tile">
            <div className="value">{data.systemHealth.eventsConsumedLast24h}</div>
            <div className="label">Kafka events consumed (24h)</div>
          </div>
          <div className="stat-tile">
            <div className="value">{data.systemHealth.usageRecordsLast24h}</div>
            <div className="label">Usage records written (24h)</div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Known services</h3>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {KNOWN_SERVICES.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td style={{ color: "var(--text-muted)" }}>{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 12 }}>
          Live up/down pings are not implemented in this pass — this page lists what exists, not its current health.
        </p>
      </div>
    </ProtectedShell>
  );
}
