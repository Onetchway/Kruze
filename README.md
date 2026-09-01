# Kruze — Enterprise Employee Mobility & Fleet Operating System

Multi-tenant, multi-organisation SaaS platform for enterprise employee
transportation, fleet operations, vendor management, compliance, routing,
safety, trip execution and billing. Full product scope is documented in
[`docs/product/`](docs/product) (source specs); architectural decisions are
recorded in [`docs/adr/`](docs/adr).

Core principle: **the system plans automatically; humans manage
exceptions.**

## Status: Core platform (Foundation + Operations + Automation + Enterprise)

This repository implements the full backend module set described in the
specs, end to end from tenant onboarding through automated daily planning,
live trip execution and commercial reconciliation:

- **Monorepo**: pnpm workspaces (`apps/*`, `packages/*`).
- **`packages/domain`**: shared enums/types (organisation roles,
  relationship types, platform roles, authorization context).
- **`apps/api`**: NestJS + TypeScript + PostgreSQL (Prisma), modular
  monolith with domain-aligned module boundaries.

**Foundation**
  - `identity` / `auth` — users, JWT login scoped to an organisation membership.
  - `organisation` — onboarding/approval, global Kruze IDs (`KZ-COR-...`).
  - `relationship` — organisation-relationship invite/accept/terminate
    (Operator↔Corporate, Corporate↔Vendor, ...) — the connective tissue the
    spec insists on instead of a rigid parent-child tree.
  - `authz` — RBAC (`RolesGuard`) + relationship/attribute policy layer
    (`PolicyService`) — never authorize by resource ID alone.
  - `audit` — `@Audited()` decorator/interceptor writing actor/before/after
    rows for every marked mutation, plus correlation-ID middleware.
  - `driver` / `vehicle` / `guard` — global identity + vendor-relationship
    model: one identity, many concurrent vendor relationships.
  - `compliance` — documents, configurable compliance rules (global/vendor/
    corporate scope), evaluation engine used as an eligibility gate.
  - `contract` — corporate-vendor contracts and versioned rate cards
    (PER_KM/PER_TRIP/HYBRID/SLAB pricing models), optionally scoped to a
    `zone` — a named/coded billing area a corporate defines, not a
    geofence. A zone-scoped card must currently be selected manually
    (trip-to-zone auto-resolution isn't wired — a trip has no zoneId yet).
  - `zone` — a corporate's billing zones.

**Operations**
  - `employee` — corporate employee master.
  - `roster` — shift templates and roster entries (opt-in/opt-out with a
    configurable per-shift booking cut-off).
  - `trip` — trip state machine, stops, employee manifest, resource
    assignment with compliance-eligibility and double-booking checks.
  - `otp` — hashed, short-lived pickup/drop OTP challenges with attempt
    limiting and supervisor override.
  - `tracking` — location ingestion (kept off the ordinary CRUD path),
    latest-location/history queries, geofence arrival checks.
  - `notification` — channel-adapter-based outbound notification log.

**Automation & Safety**
  - `planning` — the automation loop: roster demand → grouping → eligible
    vendor/resource filtering (compliance + availability) → safety hard
    constraints → auto driver/vehicle/guard allocation → exceptions →
    versioned plan → publish. A deterministic heuristic, not a real VRP
    solver — see the module's doc comment for why that's an acceptable
    starting point.
  - `safety` — configurable safety policies/rules (last-drop restriction,
    mandatory guard, max ride time), evaluated as hard constraints and
    persisted with policy version + context for audit.
  - `incident` — no-show, breakdown → eligible-replacement search, SOS, and
    general incident case management.
  - `ev` — battery/SOC + charging-session log, range-aware eligibility
    check (`rangeEligible`) for EV allocation.
  - `maintenance` — preventive/repair records; an open blocking record
    makes a vehicle ineligible for auto-assignment (wired into `planning`).

**Enterprise**
  - `billing` — trip-charge computation from a contract's effective rate
    card, invoice creation and claimed-vs-validated reconciliation with
    dispute/approval workflow.
  - `driver-payment` — Operational MIS: periodic driver payment vouchers,
    summed from that driver's completed trips' `TripCharge.vendorPayable`
    for the vendor within the period; locking freezes the amounts.
  - `analytics` — corporate dashboard, vendor performance, compliance
    summary aggregate endpoints.
  - `subscription` — Kruze ↔ organisation SaaS billing: plans as named
    feature-key bundles, per-organisation entitlement overrides, usage
    metering — kept separate from the corporate ↔ vendor `billing` module.
  - `workflow` — one generic `ApprovalRequest` primitive (PENDING →
    APPROVED/REJECTED/CANCELLED with actor + reason) reused across vendor
    onboarding, invoice approval, manual overrides, etc., instead of a
    bespoke table per approval type.

**`apps/corporate-web`**: Next.js (App Router) + TypeScript. Despite the
name it now serves three of the spec's account types from one app, since
they share the same shell and the backend already enforces who can do
what: at signup you pick **Corporate**, **Fleet Operator**, or **Vendor**,
and the nav adapts —
- Corporate: shifts, employees with roster opt-in, and the
  automation-first Dashboard (generate a plan, see the same "N employees /
  N trips / N exceptions" summary and exception-review CTA the spec's UX
  section describes, then publish).
- Fleet Operator / Vendor: **Fleet** (register vehicles — make/model/type/
  capacity/fuel, with EV fields for battery range) and **Drivers**. They
  become eligible for auto-assignment once a corporate connects the
  organisation and compliance/maintenance checks pass.
- Every account sees its own **Kruze ID** in the sidebar (`GET
  /organisations/me`) and a **Vendors**/**Corporates** connections page:
  enter the other side's Kruze ID (`GET /organisations/lookup`) to send an
  invite, the other party accepts, and the relationship goes ACTIVE — the
  UI on top of `organisation-relationships`, closing the loop from empty
  account to an auto-plan that actually finds eligible vehicles.
- Trips is visible to everyone; a corporate-only or fleet-only page tells
  the other account type it isn't available rather than erroring.

**`apps/admin-web`**: Next.js (App Router) + TypeScript, for Kruze
platform staff (`KRUZE_SUPER_ADMIN`) only. Login-only — platform accounts
are provisioned out of band, not self-registered — with Dashboard
(organisation counts by status/type), Organisations (approve
`PENDING_APPROVAL` tenants), Plans (create feature-key subscription
bundles), and Subscriptions (subscribe an organisation to a plan,
activate/suspend/cancel) — all against the existing `organisations` and
`subscription`-module endpoints, no new backend surface required.

**`apps/control-room-web`**: Next.js (App Router) + TypeScript, for
supervisors/dispatchers on either side (corporate or vendor). **Live
Trips** lists trips in a dispatch-relevant status (assigned/running/SOS/
breakdown/reassigning), updated live over the `realtime` WebSocket
gateway described below (30s poll as a fallback), with a per-trip detail
page (live GPS position via `GET /tracking/trips/:id/latest`, pushed
instantly on every ping; employee pickup/drop verification state; current
assignment; event log) and the three live-intervention actions the
spec's exception-first UX calls for: report a breakdown (`POST /trips/
:tripId/breakdown`), assign a replacement driver/vehicle once in
BREAKDOWN state (`POST /trips/:tripId/replace`), and a supervisor OTP
override for a stuck pickup/drop (`POST /otp-challenges/:id/override`).
**Incidents / SOS** lists open incidents (SOS alerts called out
separately) with a close-with-corrective-action action. All against
existing trip/tracking/incident/otp endpoints — no new backend surface
required beyond `realtime` itself.

**`realtime`** (backend module) — an in-process WebSocket gateway (`@nestjs/websockets` +
  socket.io), global so any module can inject it. Clients connect with
  their JWT access token and are joined to an `org:<organisationId>` room
  — a payload can only ever reach the organisations that were actually
  passed to `emitToOrg`, so tenant isolation holds over the socket the
  same way it does over REST. `trip.status`/`trip.assignment` (from
  `trip`), `trip.location` (from `tracking`), and `incident.created`/
  `incident.closed` (from `incident`) are emitted today; `control-room-web`
  subscribes to all of them and falls back to a 30s poll for reconnect
  gaps. This is the honest substitute for a real Kafka-backed event
  backbone in an environment with no message broker available — modules
  still call each other directly for domain logic, this only adds a push
  channel on top for connected browsers. A genuine broker-backed backbone
  (spec §16) is still future work once real infrastructure exists.

Not yet built: a dedicated Operator/Vendor Web (Vendor/Fleet Operator
accounts currently use `corporate-web`'s shared shell), the Employee/
Driver/Guard mobile apps, a genuine VRP/OR-Tools optimizer (`planning` is
still the deterministic heuristic described above), HRMS/SSO integrations,
and independent security hardening beyond the audit already done in this
repo (VAPT, load testing) — see §17–21 of the specs for that scope.

## Getting started

```bash
pnpm install

# local Postgres (either works)
docker compose up -d postgres
# — or use a system PostgreSQL and point DATABASE_URL at it —

cp apps/api/.env.example apps/api/.env   # edit DATABASE_URL/JWT secret as needed
pnpm --filter @kruze/api exec prisma migrate deploy

pnpm api:dev       # start the API on :3000 (prefix /v1)
pnpm api:test      # unit tests
pnpm api:test:e2e  # e2e tests, incl. tenant-isolation authorization suite

cp apps/corporate-web/.env.local.example apps/corporate-web/.env.local
pnpm --filter @kruze/corporate-web dev -- -p 3100   # Corporate Portal on :3100

pnpm --filter @kruze/api exec ts-node -r tsconfig-paths/register prisma/seed-super-admin.ts  # SUPER_ADMIN_EMAIL/PASSWORD env vars required — bootstraps the first Admin Web account

cp apps/admin-web/.env.local.example apps/admin-web/.env.local
pnpm --filter @kruze/admin-web dev -- -p 3200       # Admin console on :3200

cp apps/control-room-web/.env.local.example apps/control-room-web/.env.local
pnpm --filter @kruze/control-room-web dev -- -p 3300  # Control Room on :3300
```

Open http://localhost:3100, "Create an account" to self-register a
corporate, then create a shift, add an employee, opt them in for today, and
Generate Plan on the Dashboard.

## Correctness is tested, not promised

Two e2e suites run against a real PostgreSQL database on every CI run:

`tenant-isolation.e2e-spec.ts` — cross-tenant isolation:
- A vendor cannot read another vendor's driver.
- A corporate cannot read a vendor's vehicle without an explicit
  `CorporateResourceEligibility` record — and can once one is granted.
- An organisation relationship only authorizes access once the *invited*
  party accepts it; the inviter cannot self-accept.
- A driver can hold two concurrent, independent vendor relationships under
  one global identity, with each vendor seeing only its own relationship
  context.

`operations-critical.e2e-spec.ts` — the automation-first operating loop:
- A non-compliant driver (missing a required verified document) cannot be
  assigned to a trip; assignment succeeds once the document is verified.
- Pickup and drop OTPs are independent challenges; a verified OTP cannot be
  re-verified, and one purpose's code cannot verify the other.
- A mandatory guard-required safety rule blocks plan publication and raises
  a `NO_GUARD_AVAILABLE` exception; re-running `generate` for the same
  shift/date creates a new plan version and supersedes the old one rather
  than overwriting it.
- A driver cannot be double-booked across overlapping trips.

## Repository layout

```
apps/
  api/                 NestJS backend (modular monolith)
  corporate-web/       Next.js Corporate Portal
packages/
  domain/              Shared enums/types used across apps
docs/
  adr/                 Architecture decision records
  product/             Source product specs (PRD / technical blueprint)
```
