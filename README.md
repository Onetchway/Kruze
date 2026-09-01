# Kruze — Enterprise Employee Mobility & Fleet Operating System

Multi-tenant, multi-organisation SaaS platform for enterprise employee
transportation, fleet operations, vendor management, compliance, routing,
safety, trip execution and billing. Full product scope is documented in
[`docs/product/`](docs/product) (source specs); architectural decisions are
recorded in [`docs/adr/`](docs/adr).

Core principle: **the system plans automatically; humans manage
exceptions.**

## Status: Foundation phase

This repository currently implements the *foundation* layer described in
the specs' "Coding Order" / "First Engineering Sprint" sections — the
layer every operational module (roster, trips, planning, safety, billing)
will be built on:

- **Monorepo**: pnpm workspaces (`apps/*`, `packages/*`).
- **`packages/domain`**: shared enums/types (organisation roles,
  relationship types, platform roles, authorization context).
- **`apps/api`**: NestJS + TypeScript + PostgreSQL (Prisma), modular
  monolith with domain-aligned module boundaries.
  - `identity` — users.
  - `auth` — JWT login with organisation-membership context.
  - `organisation` — onboarding/approval, global Kruze IDs (`KZ-COR-...`).
  - `relationship` — organisation-relationship invite/accept/terminate
    (Operator↔Corporate, Corporate↔Vendor, etc.) — the connective tissue
    the spec insists on instead of a rigid parent-child tree.
  - `authz` — RBAC (`RolesGuard`) + relationship/attribute policy layer
    (`PolicyService`) — never authorize by resource ID alone.
  - `audit` — `AuditService` + `@Audited()` decorator/interceptor; every
    mutation marked `@Audited` writes an actor/before/after/reason row.
  - `driver` / `vehicle` / `guard` — global identity + vendor-relationship
    model: one identity, many concurrent vendor relationships, vendor- and
    corporate-scoped visibility enforced through `PolicyService`.
  - `common` — Prisma service, correlation-ID middleware, request context.

Not yet built (tracked as follow-up phases per the specs): documents &
compliance engine, contracts/rate cards, shift/roster, transport
planning/optimization, trip lifecycle, OTP, GPS/tracking, safety policy
engine, notifications, billing/invoice reconciliation, analytics.

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

## Tenant isolation is a tested property, not a promise

`apps/api/test/tenant-isolation.e2e-spec.ts` runs the platform's critical
cross-tenant scenarios against a real PostgreSQL database on every CI run:

- A vendor cannot read another vendor's driver.
- A corporate cannot read a vendor's vehicle without an explicit
  `CorporateResourceEligibility` record — and can once one is granted.
- An organisation relationship only authorizes access once the *invited*
  party accepts it; the inviter cannot self-accept.
- A driver can hold two concurrent, independent vendor relationships under
  one global identity, with each vendor seeing only its own relationship
  context.

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
