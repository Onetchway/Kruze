"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/organisations", label: "Organisations" },
  { href: "/plans", label: "Plans" },
  { href: "/subscriptions", label: "Subscriptions" },
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
        <h1>Kruze Admin</h1>
        <nav>
          {NAV_ITEMS.map((item) => (
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
