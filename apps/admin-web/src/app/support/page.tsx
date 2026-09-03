"use client";

import { ProtectedShell } from "@/components/ProtectedShell";

export default function SupportPage() {
  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Support</h2>
      <div className="card">
        <p style={{ color: "var(--text-muted)" }}>
          Support ticket management is a separate product surface and explicitly out of scope for this wave. No
          ticket/case model exists in the schema yet. Noted as future work.
        </p>
      </div>
    </ProtectedShell>
  );
}
