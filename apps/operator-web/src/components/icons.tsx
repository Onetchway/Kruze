/**
 * Minimal stroke-based nav/UI icon set (Feather/Lucide-style: 24x24 viewBox,
 * 2px round stroke, no fill). Hand-written to avoid a new dependency —
 * inherits color via currentColor so it works in both default and
 * active-pill (white-on-accent) nav states.
 */
import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export type IconName =
  | "dashboard"
  | "users"
  | "user"
  | "pin"
  | "clock"
  | "calendar"
  | "car"
  | "building"
  | "shield"
  | "check"
  | "money"
  | "chart"
  | "plug"
  | "settings"
  | "van"
  | "compass"
  | "link"
  | "key"
  | "flag"
  | "bell"
  | "support"
  | "lock"
  | "scroll"
  | "heart"
  | "wrench"
  | "card"
  | "alert"
  | "search"
  | "grid"
  | "list"
  | "logout";

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 9a3 3 0 1 0 0-6" />
      <path d="M18.5 14c2.2.5 3.5 2.4 3.5 6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  car: (
    <>
      <path d="M4 16V11l2-5h12l2 5v5" />
      <path d="M2.5 16h19" />
      <circle cx="7.5" cy="16.5" r="1.7" />
      <circle cx="16.5" cy="16.5" r="1.7" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="12" height="18" rx="1" />
      <path d="M16 8h4v13h-4" />
      <path d="M8 7h.01M12 7h.01M8 11h.01M12 11h.01M8 15h.01M12 15h.01" strokeWidth={2.4} />
    </>
  ),
  shield: (
    <path d="M12 3l7 3v6c0 4.6-3 8-7 9-4-1-7-4.4-7-9V6l7-3Z" />
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16 9.5" />
    </>
  ),
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 10v.01M18 14v.01" strokeWidth={2.6} />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2 20h20" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0V8Z" />
      <path d="M12 17v4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.5-2-3.5-2.4.8a8 8 0 0 0-1.7-1L15 3h-6l-.3 2.3a8 8 0 0 0-1.7 1l-2.4-.8-2 3.5L4.6 11a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.5 2.4-.8a8 8 0 0 0 1.7 1L9 21h6l.3-2.3a8 8 0 0 0 1.7-1l2.4.8 2-3.5-2-1.5Z" />
    </>
  ),
  van: (
    <>
      <path d="M2.5 16V9a1 1 0 0 1 1-1H14l4.5 4.2V16" />
      <path d="M2.5 16h19M14 8v7" />
      <circle cx="7" cy="17" r="1.8" />
      <circle cx="17" cy="17" r="1.8" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 6-6 2 2-6 6-2Z" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4.5 4.5 0 0 0 6.4.3l2.3-2.3a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4-.3L5.3 12a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4.2" />
      <path d="M11 12l8.5-8.5M17 6l2.5 2.5M14.5 8.5L17 11" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h13l-3 4.5L18 13H5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 14.5 6 10Z" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  support: (
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
      <path d="M19.5 19v.5a3 3 0 0 1-3 3H13" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  scroll: (
    <>
      <path d="M6 3h12v15a3 3 0 0 1-3 3H6a3 3 0 0 1 3-3h9" />
      <path d="M6 3a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.5-9.7-9A5.3 5.3 0 0 1 12 6.5 5.3 5.3 0 0 1 21.7 11c-2.2 4.5-9.7 9-9.7 9Z" />
  ),
  wrench: (
    <path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.4L3 17.4 6.6 21l5.7-5.7a4.5 4.5 0 0 0 5.4-6l-3 3-2.4-2.4 3-3Z" />
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6 15h4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l10 18H2L12 3Z" />
      <path d="M12 10v4M12 17.5v.01" strokeWidth={2.4} />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" strokeWidth={2.8} />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      {PATHS[name]}
    </svg>
  );
}

export function NavIcon({ name }: { name: IconName }) {
  return (
    <span className="app-nav-icon">
      <Icon name={name} />
    </span>
  );
}
