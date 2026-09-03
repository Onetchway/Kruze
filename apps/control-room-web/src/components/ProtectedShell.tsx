"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon, NavIcon, IconName } from "@/components/icons";

const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/trips", label: "Live Trips", icon: "compass" },
  { href: "/incidents", label: "Incidents / SOS", icon: "alert" },
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
          <span>Control Room</span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <a key={item.href} href={item.href} className={active ? "active" : undefined}>
                <NavIcon name={item.icon} />
                {item.label}
              </a>
            );
          })}
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
            <input type="search" placeholder="Search trips, incidents..." />
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
