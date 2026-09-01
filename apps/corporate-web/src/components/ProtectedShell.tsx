"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const CORPORATE_ROLES = ["CORPORATE_TRANSPORT_ADMIN", "CORPORATE_HR"];
const FLEET_ROLES = ["VENDOR_ADMIN", "FLEET_OPERATOR_ADMIN"];

function navItemsForRole(role: string) {
  const items = [{ href: "/dashboard", label: "Dashboard" }];
  if (CORPORATE_ROLES.includes(role)) {
    items.push(
      { href: "/employees", label: "Employees" },
      { href: "/shifts", label: "Shifts" },
      { href: "/locations", label: "Drop Locations" },
    );
  }
  if (FLEET_ROLES.includes(role)) {
    items.push({ href: "/fleet", label: "Fleet" }, { href: "/drivers", label: "Drivers" });
  }
  items.push({ href: "/connections", label: CORPORATE_ROLES.includes(role) ? "My Fleet" : "Corporates" });
  items.push({ href: "/trips", label: "Trips" });
  if (CORPORATE_ROLES.includes(role)) {
    items.push({ href: "/settings", label: "Settings" });
  }
  return items;
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
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

  const navItems = navItemsForRole(session.role);

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <h1>Kruze</h1>
        {globalOrgId && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -16, marginBottom: 20 }}>
            Your Kruze ID
            <br />
            <strong style={{ color: "var(--text)" }}>{globalOrgId}</strong>
          </div>
        )}
        <nav>
          {navItems.map((item) => (
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
