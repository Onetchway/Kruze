"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, SearchResult } from "@/lib/api";
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
      { href: "/decision-log", label: "Decision Log", icon: "list" },
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

function GlobalSearch() {
  const { session } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Record<string, SearchResult[]> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!session || q.trim().length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api
        .globalSearch(session.accessToken, q.trim())
        .then((res) => {
          setResults(res);
          setOpen(true);
        })
        .catch(() => setResults({}))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, session]);

  const groups = results ? Object.entries(results) : [];
  const totalResults = groups.reduce((sum, [, rows]) => sum + rows.length, 0);

  return (
    <div className="app-topbar-search" ref={containerRef}>
      <Icon name="search" />
      <input
        type="search"
        placeholder="Search organisations, users, trips..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (results) setOpen(true);
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="app-topbar-search-results">
          {loading && <div className="app-topbar-search-empty">Searching…</div>}
          {!loading && totalResults === 0 && <div className="app-topbar-search-empty">No matches for &quot;{q}&quot;.</div>}
          {!loading &&
            groups.map(([type, rows]) => (
              <div key={type}>
                <div className="app-topbar-search-group">{type}</div>
                {rows.map((r) => (
                  <a key={`${type}-${r.id}`} className="app-topbar-search-row" href={r.url} onClick={() => setOpen(false)}>
                    <span className="label">{r.label}</span>
                    <span className="sublabel">{r.sublabel}</span>
                  </a>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
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
          <GlobalSearch />
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
