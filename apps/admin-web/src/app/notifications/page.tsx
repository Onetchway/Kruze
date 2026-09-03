"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  api,
  ApiError,
  NotificationChannelValue,
  NotificationTemplate,
  NotificationTemplateCategory,
} from "@/lib/api";
import { ProtectedShell } from "@/components/ProtectedShell";

const CATEGORIES: NotificationTemplateCategory[] = [
  "EMPLOYEE",
  "DRIVER",
  "VENDOR",
  "CORPORATE",
  "GUARD",
  "BILLING",
  "COMPLIANCE",
  "SAFETY",
  "SYSTEM",
];

const CHANNELS: NotificationChannelValue[] = ["PUSH", "SMS", "WHATSAPP", "EMAIL"];

const emptyForm = {
  id: null as string | null,
  name: "",
  category: "SYSTEM" as NotificationTemplateCategory,
  channels: [] as NotificationChannelValue[],
  subject: "",
  body: "",
};

export default function NotificationsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<NotificationTemplate[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function reload() {
    if (!session) return;
    api
      .listNotificationTemplates(session.accessToken, { category: categoryFilter || undefined })
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load templates"));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [session, categoryFilter]);

  function startCreate() {
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(t: NotificationTemplate) {
    setForm({ id: t.id, name: t.name, category: t.category, channels: t.channels, subject: t.subject ?? "", body: t.body });
    setShowForm(true);
  }

  function toggleChannel(ch: NotificationChannelValue) {
    setForm((f) => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch] }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !form.name.trim() || form.channels.length === 0 || !form.body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: form.name.trim(),
        category: form.category,
        channels: form.channels,
        subject: form.subject.trim() || undefined,
        body: form.body.trim(),
      };
      if (form.id) {
        await api.updateNotificationTemplate(session.accessToken, form.id, input);
      } else {
        await api.createNotificationTemplate(session.accessToken, input);
      }
      setShowForm(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: NotificationTemplate) {
    if (!session) return;
    setBusyId(t.id);
    setError(null);
    try {
      if (t.active) await api.deactivateNotificationTemplate(session.accessToken, t.id);
      else await api.activateNotificationTemplate(session.accessToken, t.id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update template");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProtectedShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>Notifications</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
            Notification-template catalogue (spec §53) — name, category, channels, subject/body. This defines
            templates a Super Admin authors; the send pipeline (<code>Notification</code> model) does not yet resolve
            through this catalogue by name, so editing a template here does not change any message already queued.
          </p>
        </div>
        <button onClick={startCreate}>+ New template</button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {showForm && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{form.id ? "Edit template" : "New template"}</h3>
          <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as NotificationTemplateCategory }))}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Channels</label>
              <div style={{ display: "flex", gap: 12 }}>
                {CHANNELS.map((ch) => (
                  <label key={ch} style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 400 }}>
                    <input type="checkbox" checked={form.channels.includes(ch)} onChange={() => toggleChannel(ch)} />
                    {ch}
                  </label>
                ))}
              </div>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Subject (optional)</label>
              <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Body</label>
              <textarea rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving || form.channels.length === 0}>
                {form.id ? "Save changes" : "Create template"}
              </button>
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Channels</th>
              <th>Subject</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>
                  <span className="badge">{t.category}</span>
                </td>
                <td>{t.channels.join(", ")}</td>
                <td>{t.subject ?? "—"}</td>
                <td>
                  <span className={`badge${t.active ? " success" : ""}`}>{t.active ? "Active" : "Inactive"}</span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="secondary" onClick={() => startEdit(t)}>
                    Edit
                  </button>{" "}
                  <button disabled={busyId === t.id} className="secondary" onClick={() => toggleActive(t)}>
                    {t.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  No templates yet — create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ProtectedShell>
  );
}
