"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/organisations", label: "Organisations", icon: "🏢" },
  { href: "/relationships", label: "Relationships", icon: "🔗" },
  { href: "/users", label: "Users & Access", icon: "👤" },
  { href: "/fleet", label: "Fleet & Resources", icon: "🚐" },
  { href: "/operations", label: "Transport Operations", icon: "🧭" },
  { href: "/planning", label: "Planning & Automation", icon: "⚙" },
  { href: "/compliance", label: "Safety & Compliance", icon: "🛟" },
  { href: "/plans", label: "SaaS Plans & Billing", icon: "💳" },
  { href: "/integrations", label: "Integrations", icon: "🔌" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
  { href: "/reports", label: "Reports & Analytics", icon: "📊" },
  { href: "/support", label: "Support", icon: "🎧" },
  { href: "/security", label: "Security Centre", icon: "🔐" },
  { href: "/audit-log", label: "Audit Logs", icon: "📜" },
  { href: "/system-health", label: "System Health", icon: "❤" },
  { href: "/settings", label: "Platform Settings", icon: "🛠" },
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
