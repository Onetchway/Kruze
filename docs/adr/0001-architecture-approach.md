# ADR 0001: Foundation architecture approach

Status: Accepted
Date: 2026-09-01

## Context

Kruze is a multi-tenant, multi-organisation B2B/B2B2B SaaS platform for
enterprise employee transportation and fleet operations. The product spec
(see `docs/product/`) calls for relationship-driven authorization (RBAC is
explicitly insufficient on its own), a global identity model for
drivers/vehicles/guards shared across organisations, and an
automation-first operating loop. The full scope (30+ functional modules) is
too large to build in one pass, so this ADR fixes the starting
architecture and the order of construction.

## Decision

- **Monorepo**, pnpm workspaces: `apps/*` (deployable services/frontends),
  `packages/*` (shared libraries).
- **Modular monolith** for the backend (`apps/api`), NestJS + TypeScript,
  with strict module boundaries mirroring the domain module list in the
  spec (`/auth /identity /tenant /organisation /relationship ...`). Extract
  services only when scale justifies it — do not start with microservices.
- **PostgreSQL** as system of record, accessed through Prisma. Every
  tenant-scoped table carries explicit organisation context for secure
  filtering.
- **Authorization**: RBAC + relationship context + attribute checks,
  implemented as a single policy-evaluation service invoked through a
  guard/decorator — never authorize by resource ID alone, never trust a
  client-supplied organisation ID.
- **Audit**: every mutation that changes security- or business-critical
  state emits an audit_log row (actor, before/after, reason, correlation
  ID) via an interceptor, not ad hoc per-handler calls.
- **Build order** follows the spec's own "Coding Order" / "First
  Engineering Sprint" sections: identity & organisation membership →
  organisation relationships & authorization policy → audit →
  corporate/vendor/driver/vehicle/guard masters → (later) documents,
  compliance, contracts, roster, trips, planning, safety, billing.

## Consequences

- Early modules (auth, organisation, relationship, authz, audit,
  driver/vehicle/guard identity) form the foundation every later module
  depends on; they are built first and tested for tenant isolation before
  any operational module (roster, trips, planning) is started.
- Operational modules (shift/roster, trip lifecycle, route optimization,
  safety engine, billing, etc.) are deliberately out of scope for this
  pass and tracked as follow-up work.
