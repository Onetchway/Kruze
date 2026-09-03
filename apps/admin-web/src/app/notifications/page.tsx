"use client";

import { ProtectedShell } from "@/components/ProtectedShell";

export default function NotificationsPage() {
  return (
    <ProtectedShell>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Notifications</h2>
      <div className="card">
        <p style={{ color: "var(--text-muted)" }}>
          A notification-template catalogue (name, category, channels) is not built in this pass. The
          <code> Notification</code> model in the schema records individual sent messages (channel, status, template
          key) but there is no separate template-definition table to list read-only, and adding one was judged
          over-scope relative to the rest of this wave&apos;s priorities. Noted as future work.
        </p>
      </div>
    </ProtectedShell>
  );
}
