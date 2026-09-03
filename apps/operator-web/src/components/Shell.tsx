"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
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
    label: "Fleet",
    children: [
      { href: "/fleet", label: "Fleet", icon: "van" },
      { href: "/drivers", label: "Drivers", icon: "user" },
      { href: "/guards", label: "Guards", icon: "shield" },
    ],
  },
  {
    label: "Operations",
    children: [
      { href: "/trips", label: "Trips", icon: "compass" },
      { href: "/operational-mis", label: "Operational MIS", icon: "chart" },
    ],
  },
  { href: "/connections", label: "Corporates", icon: "link" },
];

function NavLink({ item, pathname }: { item: NavLeaf; pathname: string }) {
  return (
    <a href={item.href} className={pathname === item.href ? "active" : undefined}>
      <NavIcon name={item.icon} />
      {item.label}
    </a>
  );
}

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
            <input type="search" placeholder="Search trips, drivers, vehicles..." />
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
