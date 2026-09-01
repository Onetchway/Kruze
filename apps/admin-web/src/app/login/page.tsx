"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (result.role !== "KRUZE_SUPER_ADMIN") {
        setError("This console is for Kruze platform staff only.");
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

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h2 style={{ marginTop: 0 }}>Kruze Admin</h2>
        <p style={{ color: "var(--text-muted)", marginTop: -8, fontSize: 13 }}>Platform staff sign-in</p>
        <form onSubmit={handleLogin}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Please wait..." : "Sign in"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
        <p style={{ fontSize: 12, marginTop: 16, color: "var(--text-muted)" }}>
          Kruze platform accounts are provisioned out of band — there is no self-registration here.
        </p>
      </div>
    </div>
  );
}
