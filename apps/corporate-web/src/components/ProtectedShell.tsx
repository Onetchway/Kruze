"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, Organisation } from "@/lib/api";

const CORPORATE_ROLES = ["CORPORATE_TRANSPORT_ADMIN", "CORPORATE_HR"];
const FLEET_ROLES = ["VENDOR_ADMIN", "FLEET_OPERATOR_ADMIN"];

function navItemsForRole(role: string) {
  const items = [{ href: "/dashboard", label: "Dashboard", icon: "▦" }];
  if (CORPORATE_ROLES.includes(role)) {
    items.push(
      { href: "/employees", label: "Employees", icon: "👥" },
      { href: "/signup-requests", label: "Signup Requests", icon: "📥" },
      { href: "/rosters", label: "Rosters", icon: "📅" },
      { href: "/live-ops", label: "Live Operations", icon: "🛰" },
      { href: "/safety", label: "Safety", icon: "🛡" },
      { href: "/shifts", label: "Shifts", icon: "⏱" },
      { href: "/locations", label: "Drop Locations", icon: "📍" },
      { href: "/zones", label: "Zones", icon: "🗺" },
      { href: "/contracts", label: "Contracts", icon: "📄" },
      { href: "/invoices", label: "Invoices", icon: "💳" },
      { href: "/compliance", label: "Compliance", icon: "✅" },
      { href: "/analytics", label: "Analytics", icon: "📈" },
      { href: "/integrations", label: "Integrations", icon: "🔌" },
    );
  }
  if (FLEET_ROLES.includes(role)) {
    items.push(
      { href: "/fleet", label: "Fleet", icon: "🚐" },
      { href: "/drivers", label: "Drivers", icon: "👤" },
      { href: "/operational-mis", label: "Operational MIS", icon: "📊" },
    );
  }
  items.push({ href: "/connections", label: CORPORATE_ROLES.includes(role) ? "My Fleet" : "Corporates", icon: "🔗" });
  items.push({ href: "/trips", label: "Trips", icon: "🗺" });
  if (CORPORATE_ROLES.includes(role)) {
    items.push({ href: "/settings", label: "Settings", icon: "⚙" });
  }
  return items;
}

function roleLabel(role: string): string {
  switch (role) {
    case "CORPORATE_TRANSPORT_ADMIN":
      return "Transport Admin";
    case "CORPORATE_HR":
      return "HR Admin";
    case "VENDOR_ADMIN":
      return "Vendor Admin";
    case "FLEET_OPERATOR_ADMIN":
      return "Fleet Operator";
    default:
      return role;
  }
}

export function ProtectedShell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [org, setOrg] = useState<Organisation | null>(null);

  useEffect(() => {
    if (ready && !session) {
      router.replace("/login");
    }
  }, [ready, session, router]);

  useEffect(() => {
    if (!session) return;
    api.getMyOrganisation(session.accessToken).then(setOrg).catch(() => {});
  }, [session]);

  if (!ready || !session) {
    return null;
  }

  const navItems = navItemsForRole(session.role);
  const initials = (org?.displayName ?? "K")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <div className="app-nav-brand">
          <span className="app-nav-logo">K</span>
          <span>Kruze</span>
        </div>
        <nav>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={pathname === item.href ? "active" : undefined}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="app-nav-profile">
          <div className="app-nav-profile-card">
            <span className="avatar">{initials}</span>
            <div>
              <div className="name">{org?.displayName ?? "Your organisation"}</div>
              <div className="role">{roleLabel(session.role)}</div>
              {org?.globalOrgId && <div className="kruze-id">{org.globalOrgId}</div>}
            </div>
          </div>
          <button className="secondary" onClick={logout} style={{ width: "100%", marginTop: 10 }}>
            Log out
          </button>
        </div>
      </aside>
      <main className="app-main">
        {(title || subtitle) && (
          <div className="page-header">
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
