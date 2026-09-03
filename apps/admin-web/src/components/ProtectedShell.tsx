"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon, NavIcon, IconName } from "@/components/icons";

interface NavLeaf {
  href: string;
  label: string;
  icon: IconName;
}
interface NavGroup {
  label: string;
  children: NavLeaf[];
}
type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV_TREE: NavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  {
    label: "Platform",
    children: [
      { href: "/organisations", label: "Organisations", icon: "building" },
      { href: "/relationships", label: "Relationships", icon: "link" },
      { href: "/users", label: "Users & Access", icon: "users" },
      { href: "/fleet", label: "Fleet & Resources", icon: "van" },
      { href: "/operations", label: "Transport Operations", icon: "compass" },
    ],
  },
  {
    label: "Operations",
    children: [
      { href: "/planning", label: "Planning & Automation", icon: "settings" },
      { href: "/compliance", label: "Safety & Compliance", icon: "shield" },
    ],
  },
  {
    label: "Commercial",
    children: [
      { href: "/plans", label: "SaaS Plans & Billing", icon: "card" },
      { href: "/integrations", label: "Integrations", icon: "plug" },
      { href: "/api-keys", label: "API Keys", icon: "key" },
      { href: "/feature-flags", label: "Feature Flags", icon: "flag" },
      { href: "/notifications", label: "Notifications", icon: "bell" },
    ],
  },
  {
    label: "Insights",
    children: [
      { href: "/reports", label: "Reports & Analytics", icon: "chart" },
      { href: "/support", label: "Support", icon: "support" },
    ],
  },
  {
    label: "Settings",
    children: [
      { href: "/security", label: "Security Centre", icon: "lock" },
      { href: "/audit-log", label: "Audit Logs", icon: "scroll" },
      { href: "/system-health", label: "System Health", icon: "heart" },
      { href: "/settings", label: "Platform Settings", icon: "wrench" },
    ],
  },
];

function NavLink({ item, pathname }: { item: NavLeaf; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <a href={item.href} className={active ? "active" : undefined}>
      <NavIcon name={item.icon} />
      {item.label}
    </a>
  );
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

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <div className="app-nav-brand">
          <span className="app-nav-logo">K</span>
          <span>Kruze Admin</span>
        </div>
        <nav>
          {NAV_TREE.map((entry) =>
            isGroup(entry) ? (
              <div className="app-nav-group" key={entry.label}>
                <div className="app-nav-group-label">{entry.label}</div>
                {entry.children.map((child) => (
                  <NavLink key={child.href} item={child} pathname={pathname} />
                ))}
              </div>
            ) : (
              <NavLink key={entry.href} item={entry} pathname={pathname} />
            ),
          )}
        </nav>
        <div className="app-nav-profile">
          <button className="secondary" onClick={logout} style={{ width: "100%" }}>
            <Icon name="logout" width={15} height={15} style={{ marginRight: 6, verticalAlign: -2 }} />
            Log out
          </button>
        </div>
      </aside>
      <main className="app-main">
        <div className="app-topbar">
          <div className="app-topbar-search">
            <Icon name="search" />
            <input type="search" placeholder="Search organisations, users, trips..." />
          </div>
          <div className="app-topbar-actions">
            <button className="app-topbar-icon-btn" type="button" aria-label="Notifications">
              <Icon name="bell" />
              <span className="badge-dot" />
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
