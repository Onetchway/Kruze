"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function EmployeeSignupPage() {
  const [globalOrgId, setGlobalOrgId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.employeeSignup({
        globalOrgId,
        fullName,
        phone,
        email: email || undefined,
        department: department || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h2 style={{ marginTop: 0 }}>Request transport access</h2>
        {submitted ? (
          <p>
            Your request has been submitted. Your employer&rsquo;s transport admin will review it — you&rsquo;ll be able
            to use the service once approved.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Employer&rsquo;s Kruze ID</label>
              <input
                value={globalOrgId}
                onChange={(e) => setGlobalOrgId(e.target.value)}
                required
                placeholder="KZ-COR-000001"
              />
            </div>
            <div className="field">
              <label>Your name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+91..." />
            </div>
            <div className="field">
              <label>Email (optional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Department (optional)</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <button type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Please wait..." : "Submit request"}
            </button>
            {error && <p className="error-text">{error}</p>}
          </form>
        )}
        <p style={{ fontSize: 13, marginTop: 16 }}>
          <a href="/login">Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
