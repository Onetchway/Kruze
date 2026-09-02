"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/fleet", label: "Fleet", icon: "🚐" },
  { href: "/drivers", label: "Drivers", icon: "👤" },
  { href: "/guards", label: "Guards", icon: "🛡" },
  { href: "/trips", label: "Trips", icon: "🧭" },
  { href: "/operational-mis", label: "Operational MIS", icon: "📊" },
  { href: "/connections", label: "Corporates", icon: "🔗" },
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
        <div className="app-nav-brand">
          <span className="app-nav-logo">K</span>
          <span>Kruze Operator</span>
        </div>
        {globalOrgId && (
          <div className="app-nav-id">
            Your Kruze ID
            <br />
            <strong>{globalOrgId}</strong>
          </div>
        )}
        <nav>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className={pathname === item.href ? "active" : undefined}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="app-nav-profile">
          <button className="secondary" onClick={logout} style={{ width: "100%" }}>
            Log out
          </button>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
