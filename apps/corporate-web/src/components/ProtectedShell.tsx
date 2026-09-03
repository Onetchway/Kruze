"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, Organisation } from "@/lib/api";
import { Icon, NavIcon, IconName } from "@/components/icons";

const CORPORATE_ROLES = [
  "CORPORATE_TRANSPORT_ADMIN",
  "CORPORATE_TRANSPORT_MANAGER",
  "CORPORATE_TRANSPORT_SUPERVISOR",
  "CORPORATE_MANAGEMENT",
  "CORPORATE_HR",
  "CORPORATE_FINANCE",
  "CORPORATE_SAFETY_COMPLIANCE",
  "AUDITOR",
];
const FLEET_ROLES = ["VENDOR_ADMIN", "FLEET_OPERATOR_ADMIN"];

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

function navTreeForRole(role: string): NavEntry[] {
  if (FLEET_ROLES.includes(role)) {
    return [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/fleet", label: "Fleet", icon: "van" },
      { href: "/drivers", label: "Drivers", icon: "user" },
      { href: "/guards", label: "Guards", icon: "shield" },
      { href: "/trips", label: "Trips", icon: "compass" },
      { href: "/operational-mis", label: "Operational MIS", icon: "chart" },
      { href: "/connections", label: "Corporates", icon: "link" },
    ];
  }

  return [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    {
      label: "HRMS",
      children: [
        { href: "/employees", label: "Employees", icon: "users" },
        { href: "/signup-requests", label: "Signup Requests", icon: "user" },
      ],
    },
    {
      label: "Locations",
      children: [
        { href: "/locations", label: "Drop Locations", icon: "pin" },
        { href: "/zones", label: "Zones", icon: "pin" },
      ],
    },
    {
      label: "Operations",
      children: [
        { href: "/shifts", label: "Shifts", icon: "clock" },
        { href: "/rosters", label: "Rosters", icon: "calendar" },
        { href: "/transport-requests", label: "Transport Requests", icon: "car" },
        { href: "/trips", label: "Trips", icon: "compass" },
        { href: "/live-ops", label: "Live Operations", icon: "compass" },
        { href: "/routes", label: "Routes", icon: "compass" },
        { href: "/exceptions", label: "Exceptions", icon: "alert" },
      ],
    },
    {
      label: "Vendors & Operators",
      children: [
        { href: "/connections", label: "Vendors", icon: "link" },
        { href: "/fleet", label: "Fleet", icon: "van" },
        { href: "/drivers", label: "Drivers", icon: "user" },
        { href: "/guards", label: "Guards", icon: "shield" },
      ],
    },
    {
      label: "Safety",
      children: [
        { href: "/safety", label: "Live Safety", icon: "shield" },
        { href: "/safety/sos", label: "SOS", icon: "alert" },
        { href: "/safety/female-safety", label: "Female Safety", icon: "heart" },
        { href: "/guard-escort", label: "Guard / Escort", icon: "shield" },
      ],
    },
    { href: "/compliance", label: "Compliance", icon: "check" },
    {
      label: "Commercial",
      children: [
        { href: "/contracts", label: "Contracts", icon: "scroll" },
        { href: "/rate-cards", label: "Rate Cards", icon: "card" },
        { href: "/invoices", label: "Invoices", icon: "money" },
        { href: "/vendor-payables", label: "Vendor Payables", icon: "money" },
        { href: "/reconciliation", label: "Reconciliation", icon: "check" },
        { href: "/cost-analytics", label: "Cost Analytics", icon: "chart" },
      ],
    },
    {
      label: "Settings",
      children: [
        { href: "/analytics", label: "Analytics", icon: "chart" },
        { href: "/integrations", label: "Integrations", icon: "plug" },
        { href: "/settings", label: "Settings", icon: "settings" },
      ],
    },
  ];
}

function roleLabel(role: string): string {
  switch (role) {
    case "CORPORATE_TRANSPORT_ADMIN":
      return "Corporate Super Admin";
    case "CORPORATE_TRANSPORT_MANAGER":
      return "Transport Manager";
    case "CORPORATE_TRANSPORT_SUPERVISOR":
      return "Transport Supervisor";
    case "CORPORATE_MANAGEMENT":
      return "Management / Executive";
    case "CORPORATE_HR":
      return "HR Admin";
    case "CORPORATE_FINANCE":
      return "Finance Manager";
    case "CORPORATE_SAFETY_COMPLIANCE":
      return "Safety / Compliance Manager";
    case "AUDITOR":
      return "Auditor";
    case "VENDOR_ADMIN":
      return "Vendor Admin";
    case "FLEET_OPERATOR_ADMIN":
      return "Fleet Operator";
    default:
      return role;
  }
}

function NavLink({ item, pathname }: { item: NavLeaf; pathname: string }) {
  return (
    <a href={item.href} className={pathname === item.href ? "active" : undefined}>
      <NavIcon name={item.icon} />
      {item.label}
    </a>
  );
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

  const navTree = navTreeForRole(session.role);
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
          {navTree.map((entry) =>
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
          <div className="app-nav-profile-card">
            <span className="avatar">{initials}</span>
            <div>
              <div className="name">{org?.displayName ?? "Your organisation"}</div>
              <div className="role">{roleLabel(session.role)}</div>
              {org?.globalOrgId && <div className="kruze-id">{org.globalOrgId}</div>}
            </div>
          </div>
          <button className="secondary" onClick={logout} style={{ width: "100%", marginTop: 10 }}>
            <Icon name="logout" width={15} height={15} style={{ marginRight: 6, verticalAlign: -2 }} />
            Log out
          </button>
        </div>
      </aside>
      <main className="app-main">
        <div className="app-topbar">
          <div className="app-topbar-search">
            <Icon name="search" />
            <input type="search" placeholder="Search employees, trips, vendors..." />
          </div>
          <div className="app-topbar-actions">
            <button className="app-topbar-icon-btn" type="button" aria-label="Notifications">
              <Icon name="bell" />
              <span className="badge-dot" />
            </button>
          </div>
        </div>
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
