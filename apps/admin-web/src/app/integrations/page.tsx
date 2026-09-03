"use client";

import { ProtectedShell } from "@/components/ProtectedShell";

const INTEGRATIONS = [
  { name: "HRMS", desc: "Platform-level connector template corporates can adopt to sync employee master data from their HR system.", icon: "🧑‍💼" },
  { name: "Maps / GPS", desc: "Google Maps or Mapbox for live vehicle tracking, geocoding, and route rendering across every tenant.", icon: "🗺" },
  { name: "SSO", desc: "SAML/OIDC single sign-on for corporate/vendor admins — no auth infrastructure for this exists yet.", icon: "🔐" },
  { name: "ERP / Finance", desc: "Push approved invoices to a corporate's ERP (SAP, Oracle, Tally) for payment.", icon: "🧾" },
  { name: "WhatsApp", desc: "Trip reminders, OTPs, and SOS alerts over WhatsApp Business API.", icon: "💬" },
  { name: "SMS", desc: "Fallback notification channel for employees without the app.", icon: "✉️" },
  { name: "API & Webhooks", desc: "Programmatic access to trips, roster, and compliance data; outbound event webhooks.", icon: "🔗" },
];

export default function IntegrationsPage() {
  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Integrations</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Platform-level connect surface, mirroring the per-tenant Integrations page in corporate-web. Every card below
        is a UI placeholder — no credentials are configured in this environment yet.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {INTEGRATIONS.map((integration) => (
          <div className="card" key={integration.name} style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{integration.icon}</span>
              <strong>{integration.name}</strong>
              <span className="badge" style={{ marginLeft: "auto" }}>
                Not connected
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px" }}>{integration.desc}</p>
            <button className="secondary" disabled title="Requires a provider API key/credentials — not available in this environment">
              Connect
            </button>
          </div>
        ))}
      </div>
    </ProtectedShell>
  );
}
