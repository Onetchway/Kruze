"use client";

import { ProtectedShell } from "@/components/ProtectedShell";

const INTEGRATIONS = [
  { name: "HRMS", desc: "Sync employee master data (joiners/leavers, department, shift eligibility) from your HR system.", icon: "🧑‍💼" },
  { name: "Maps / GPS", desc: "Google Maps or Mapbox for live vehicle tracking, geocoding, and route rendering.", icon: "🗺" },
  { name: "SSO", desc: "SAML/OIDC single sign-on for your corporate admins and employees.", icon: "🔐" },
  { name: "ERP / Finance", desc: "Push approved invoices to your ERP (SAP, Oracle, Tally) for payment.", icon: "🧾" },
  { name: "WhatsApp", desc: "Trip reminders, OTPs, and SOS alerts over WhatsApp Business API.", icon: "💬" },
  { name: "SMS", desc: "Fallback notification channel for employees without the app.", icon: "✉️" },
  { name: "API & Webhooks", desc: "Programmatic access to trips, roster, and compliance data; outbound event webhooks.", icon: "🔗" },
];

export default function IntegrationsPage() {
  return (
    <ProtectedShell
      title="Integrations"
      subtitle="Connect Kruze to the systems you already use. Every card below is a UI placeholder — no credentials are configured in this environment yet."
    >
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
