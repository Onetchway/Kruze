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
  - `contract` — corporate-vendor contracts and versioned rate cards.

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

**Enterprise**
  - `billing` — trip-charge computation from a contract's effective rate
    card, invoice creation and claimed-vs-validated reconciliation with
    dispute/approval workflow.
  - `analytics` — corporate dashboard, vendor performance, compliance
    summary aggregate endpoints.

Not yet built: the frontend/mobile apps (Next.js/React/Flutter per the
spec), a real Kafka/WebSocket event backbone (the modules above call each
other directly and log-only for notifications), a genuine VRP/OR-Tools
optimizer, HRMS/SSO integrations, and independent security hardening
(VAPT, load testing) — see §17–21 of the specs for that scope.

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
```

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
packages/
  domain/              Shared enums/types used across apps
docs/
  adr/                 Architecture decision records
  product/             Source product specs (PRD / technical blueprint)
```
