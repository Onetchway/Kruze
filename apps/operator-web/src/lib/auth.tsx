"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

interface AuthSession {
  accessToken: string;
  organisationId: string;
  role: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  ready: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => void;
}

const STORAGE_KEY = "kruze.operator.session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSessionState(JSON.parse(raw));
      }
    } catch {
      // Ignore malformed/unavailable storage — user just has to log in again.
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      setSession: (next) => {
        setSessionState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Best-effort persistence only.
        }
      },
      logout: () => {
        setSessionState(null);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Best-effort persistence only.
        }
      },
    }),
    [session, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
