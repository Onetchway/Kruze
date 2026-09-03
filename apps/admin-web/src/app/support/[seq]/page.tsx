"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError, SupportCaseDetail, SupportCaseStatus } from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const STATUSES: SupportCaseStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];

export default function SupportCaseDetailPage() {
  const { session } = useAuth();
  const params = useParams<{ seq: string }>();
  const seq = Number(params.seq);

  const [detail, setDetail] = useState<SupportCaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [message, setMessage] = useState("");

  function reload() {
    if (!session || !seq) return;
    api.getSupportCase(session.accessToken, seq).then(setDetail).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load case"));
  }

  useEffect(reload, [session, seq]);

  async function changeStatus(status: SupportCaseStatus) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await api.changeSupportCaseStatus(session.accessToken, seq, status, note.trim() || undefined);
      setNote("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change status");
    } finally {
      setBusy(false);
    }
  }

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !assignee.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.assignSupportCase(session.accessToken, seq, assignee.trim());
      setAssignee("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign case");
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.addSupportCaseEvent(session.accessToken, seq, message.trim());
      setMessage("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add note");
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <ProtectedShell>
        <p style={{ color: "var(--text-muted)" }}>Loading case…</p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <p style={{ marginTop: 0 }}>
        <a href="/support">← Support</a>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 4 }} className="mono">
            {detail.ticketNo}
          </h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            {detail.category} · {detail.priority} priority
            {detail.slaTargetHours ? ` · SLA target ${detail.slaTargetHours}h` : ""}
          </p>
        </div>
        <span className={`badge${detail.status === "RESOLVED" || detail.status === "CLOSED" ? " success" : detail.status === "OPEN" ? " warning" : ""}`}>
          {detail.status}
        </span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Description</h3>
        <p>{detail.description}</p>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Organisation: {detail.organisation?.displayName ?? "—"} · Assignee: {detail.assigneeUserId ?? "Unassigned"} · Created{" "}
          {new Date(detail.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Change status</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {STATUSES.map((s) => (
            <button key={s} disabled={busy || s === detail.status} className={s === detail.status ? undefined : "secondary"} onClick={() => changeStatus(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="field">
          <label>Note for this status change (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. waiting on driver reply" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Assign</h3>
        <form onSubmit={assign} style={{ display: "flex", gap: 8 }}>
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Assignee user ID" style={{ flex: 1 }} />
          <button type="submit" disabled={busy || !assignee.trim()}>
            Assign
          </button>
        </form>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 0 }}>
          No user-picker lookup here yet — paste a Super Admin user ID from Users & Access.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Timeline</h3>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {detail.events.map((ev) => (
            <li key={ev.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13 }}>{ev.message}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {ev.authorUserId ?? "System"} · {new Date(ev.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
          {detail.events.length === 0 && <li style={{ color: "var(--text-muted)" }}>No events yet.</li>}
        </ul>
        <form onSubmit={addNote} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a note…" style={{ flex: 1 }} />
          <button type="submit" disabled={busy || !message.trim()}>
            Add note
          </button>
        </form>
      </div>
    </ProtectedShell>
  );
}
