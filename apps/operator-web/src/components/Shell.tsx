"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/fleet", label: "Fleet" },
  { href: "/drivers", label: "Drivers" },
  { href: "/guards", label: "Guards" },
  { href: "/trips", label: "Trips" },
  { href: "/operational-mis", label: "Operational MIS" },
  { href: "/connections", label: "Corporates" },
];

/** Every page in this app is fleet-operator/vendor-only, so — unlike corporate-web's shared shell — nothing here branches by role. */
export function Shell({ children }: { children: React.ReactNode }) {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [globalOrgId, setGlobalOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !session) {
      router.replace("/login");
    }
  }, [ready, session, router]);

  useEffect(() => {
    if (!session) return;
    api.getMyOrganisation(session.accessToken).then((org) => setGlobalOrgId(org.globalOrgId)).catch(() => {});
  }, [session]);

  if (!ready || !session) {
    return null;
  }

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <h1>Kruze Operator</h1>
        {globalOrgId && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -16, marginBottom: 20 }}>
            Your Kruze ID
            <br />
            <strong style={{ color: "var(--text)" }}>{globalOrgId}</strong>
          </div>
        )}
        <nav>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} style={pathname === item.href ? { background: "var(--bg)" } : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{ marginTop: 32 }}>
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
