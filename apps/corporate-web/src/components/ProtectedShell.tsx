"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const CORPORATE_ROLES = ["CORPORATE_TRANSPORT_ADMIN", "CORPORATE_HR"];
const FLEET_ROLES = ["VENDOR_ADMIN", "FLEET_OPERATOR_ADMIN"];

function navItemsForRole(role: string) {
  const items = [{ href: "/dashboard", label: "Dashboard" }];
  if (CORPORATE_ROLES.includes(role)) {
    items.push({ href: "/employees", label: "Employees" }, { href: "/shifts", label: "Shifts" });
  }
  if (FLEET_ROLES.includes(role)) {
    items.push({ href: "/fleet", label: "Fleet" });
  }
  items.push({ href: "/trips", label: "Trips" });
  return items;
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !session) {
      router.replace("/login");
    }
  }, [ready, session, router]);

  if (!ready || !session) {
    return null;
  }

  const navItems = navItemsForRole(session.role);

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <h1>Kruze</h1>
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
