"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/organisations", label: "Organisations", icon: "🏢" },
  { href: "/users", label: "Users", icon: "👤" },
  { href: "/plans", label: "Plans", icon: "📦" },
  { href: "/subscriptions", label: "Subscriptions", icon: "💳" },
  { href: "/audit-log", label: "Audit Log", icon: "📜" },
  { href: "/security", label: "Security", icon: "🔐" },
  { href: "/system-health", label: "System Health", icon: "❤" },
  { href: "/roles", label: "Roles", icon: "🛡" },
];

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

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <div className="app-nav-brand">
          <span className="app-nav-logo">K</span>
          <span>Kruze Admin</span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "active" : undefined}
            >
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
