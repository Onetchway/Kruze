"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

type Mode = "login" | "register";

const ACCOUNT_TYPES = [
  { value: "CORPORATE", label: "Corporate", hint: "Manage employees, roster and transport policy" },
  { value: "FLEET_OPERATOR", label: "Fleet Operator", hint: "Manage fleet, drivers and multiple corporate customers" },
  { value: "VENDOR", label: "Transport Vendor", hint: "Manage your fleet and drivers for corporates you serve" },
];

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [organisationRole, setOrganisationRole] = useState("CORPORATE");
  const [organisationLegalName, setOrganisationLegalName] = useState("");
  const [organisationDisplayName, setOrganisationDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setSession } = useAuth();
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.login(email, password);
      if (!result.accessToken || !result.organisationId || !result.role) {
        setError("This account belongs to multiple organisations; multi-org login isn't supported in this UI yet.");
        return;
      }
      setSession({ accessToken: result.accessToken, organisationId: result.organisationId, role: result.role });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.register({
        email,
        password,
        displayName,
        organisationLegalName,
        organisationDisplayName,
        organisationRole,
      });
      setSession({ accessToken: result.accessToken, organisationId: result.organisationId, role: result.role });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h2 style={{ marginTop: 0 }}>{mode === "login" ? "Sign in" : "Create your account"}</h2>
        <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
          {mode === "register" && (
            <>
              <div className="field">
                <label>Account type</label>
                <select value={organisationRole} onChange={(e) => setOrganisationRole(e.target.value)}>
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} — {t.hint}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Your name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Company legal name</label>
                <input value={organisationLegalName} onChange={(e) => setOrganisationLegalName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Company display name</label>
                <input value={organisationDisplayName} onChange={(e) => setOrganisationDisplayName(e.target.value)} required />
              </div>
            </>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
        <p style={{ fontSize: 13, marginTop: 16 }}>
          {mode === "login" ? (
            <>
              New here?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); setError(null); }}>
                Create an account
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(null); }}>
                Sign in
              </a>
            </>
          )}
        </p>
        <p style={{ fontSize: 13, marginTop: 4 }}>
          Employee? <a href="/employee-signup">Request transport access</a>
        </p>
      </div>
    </div>
  );
}
