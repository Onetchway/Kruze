"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/trips", label: "Live Trips", icon: "🧭" },
  { href: "/incidents", label: "Incidents / SOS", icon: "🚨" },
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
