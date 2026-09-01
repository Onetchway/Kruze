# Kruze Operator Web

A dedicated Next.js portal for Fleet Operator and Vendor accounts —
previously these logged into `corporate-web`'s shared shell (a nav
that hid corporate-only links, and a couple of pages that self-guarded
with a "not available for your role" message). This app is scoped
entirely to fleet/vendor needs instead:

- Login rejects non-fleet roles outright (`This portal is for Fleet
  Operator and Vendor accounts`), rather than showing a generic login
  that happens to work for any role and gating features after the
  fact.
- **Guards** (`/guards`) is genuinely new — the backend
  (`POST /guards`, `GET /guards`, guard-role compliance/eligibility)
  has existed since early in the project, but no frontend ever called
  it. A vendor/fleet operator can now onboard guards the same way they
  onboard drivers.
- **Dashboard** (`/dashboard`) is a real KPI summary (active
  vehicles/drivers/guards, trips today, trips currently in progress) —
  corporate-web's dashboard is a shift/plan-generation tool that
  doesn't apply to a vendor's role in the workflow at all.
- Fleet, Drivers, Trips, Operational MIS, and Connections carry over
  the same functionality corporate-web already had for these roles,
  just without the corporate-oriented nav items and copy.

## Running

```bash
cd apps/operator-web
pnpm install   # from the repo root, or here directly
pnpm dev       # http://localhost:3000 by default; set PORT to change

# point at a non-default API:
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/v1 pnpm dev
```

## Verified end to end

`next build` succeeds (9 static routes). Then, against the live API:
registered a new Vendor account (rejected as a login role-check first,
confirming a Corporate account is correctly turned away with the
"This portal is for Fleet Operator and Vendor accounts" message) →
landed on the dashboard → added a driver → added a guard (the new
page) → added a vehicle → all three appeared in their respective
tables → Operational MIS and Connections pages both render — all
driven through the real built UI with a headless browser, not just
`tsc`/`next build`.
