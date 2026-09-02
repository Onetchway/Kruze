"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, Organisation } from "@/lib/api";

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
  icon?: string;
}
interface NavGroup {
  label: string;
  icon: string;
  children: NavLeaf[];
}
type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

function navTreeForRole(role: string): NavEntry[] {
  if (FLEET_ROLES.includes(role)) {
    return [
      { href: "/dashboard", label: "Dashboard", icon: "▦" },
      { href: "/fleet", label: "Fleet", icon: "🚐" },
      { href: "/drivers", label: "Drivers", icon: "👤" },
      { href: "/guards", label: "Guards", icon: "🛡" },
      { href: "/trips", label: "Trips", icon: "🧭" },
      { href: "/operational-mis", label: "Operational MIS", icon: "📊" },
      { href: "/connections", label: "Corporates", icon: "🔗" },
    ];
  }

  return [
    { href: "/dashboard", label: "Dashboard", icon: "▦" },
    {
      label: "Employees",
      icon: "👥",
      children: [
        { href: "/employees", label: "Employees" },
        { href: "/signup-requests", label: "Signup Requests" },
      ],
    },
    {
      label: "Locations",
      icon: "📍",
      children: [
        { href: "/locations", label: "Drop Locations" },
        { href: "/zones", label: "Zones" },
      ],
    },
    { href: "/shifts", label: "Shifts", icon: "⏱" },
    { href: "/rosters", label: "Rosters", icon: "📅" },
    {
      label: "Transport",
      icon: "🚗",
      children: [
        { href: "/transport-requests", label: "Transport Requests" },
        { href: "/trips", label: "Trips" },
        { href: "/live-ops", label: "Live Operations" },
        { href: "/routes", label: "Routes" },
        { href: "/exceptions", label: "Exceptions" },
      ],
    },
    {
      label: "Vendors & Operators",
      icon: "🏢",
      children: [
        { href: "/connections", label: "Vendors" },
        { href: "/fleet", label: "Fleet" },
        { href: "/drivers", label: "Drivers" },
        { href: "/guards", label: "Guards" },
      ],
    },
    {
      label: "Safety",
      icon: "🛡",
      children: [
        { href: "/safety", label: "Live Safety" },
        { href: "/safety/sos", label: "SOS" },
        { href: "/safety/female-safety", label: "Female Safety" },
        { href: "/guard-escort", label: "Guard / Escort" },
      ],
    },
    { href: "/compliance", label: "Compliance", icon: "✅" },
    {
      label: "Commercial",
      icon: "💰",
      children: [
        { href: "/contracts", label: "Contracts" },
        { href: "/invoices", label: "Invoices" },
        { href: "/reconciliation", label: "Reconciliation" },
      ],
    },
    { href: "/analytics", label: "Analytics", icon: "📈" },
    { href: "/integrations", label: "Integrations", icon: "🔌" },
    { href: "/settings", label: "Settings", icon: "⚙" },
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

function NavGroupItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActiveChild = group.children.some((c) => pathname === c.href);
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div className="app-nav-group">
      <button type="button" className={`app-nav-group-toggle${hasActiveChild ? " active" : ""}`} onClick={() => setOpen((o) => !o)}>
        <span className="nav-icon">{group.icon}</span>
        {group.label}
        <span className="chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="app-nav-group-children">
          {group.children.map((child) => (
            <a key={child.href} href={child.href} className={pathname === child.href ? "active" : undefined}>
              {child.label}
            </a>
          ))}
        </div>
      )}
    </div>
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
              <NavGroupItem key={entry.label} group={entry} pathname={pathname} />
            ) : (
              <a key={entry.href} href={entry.href} className={pathname === entry.href ? "active" : undefined}>
                <span className="nav-icon">{entry.icon}</span>
                {entry.label}
              </a>
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
