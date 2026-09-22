import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { PlatformRole, SECURITY_ROLES } from "@kruze/domain";

const PER_TYPE_LIMIT = 8;

export interface SearchResult {
  type: string;
  id: string;
  label: string;
  sublabel: string;
  url: string;
}

/** Same audit-log visibility rule as PlatformAuditController (spec §2.7 read-only role included). */
const AUDIT_VIEW_ROLES: PlatformRole[] = [...SECURITY_ROLES, PlatformRole.COMPLIANCE_ADMIN, PlatformRole.READ_ONLY_SUPER_ADMIN];

/**
 * Global Search (spec §65). Fans out `q` as a `contains` filter to each
 * entity type's own table — no new permission-resolution engine, just
 * "does the searching Super Admin's role already have visibility into
 * this entity type", mirroring the @Roles() list each type's own
 * platform-admin controller already enforces. A role missing from a
 * type's list simply doesn't get that type's results.
 */
@Injectable()
export class PlatformSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(role: string, q: string): Promise<Record<string, SearchResult[]>> {
    const term = q.trim();
    if (term.length < 2) {
      return {};
    }
    const asRole = role as PlatformRole;
    const insensitive = { contains: term, mode: "insensitive" as const };

    const tasks: Array<[string, Promise<SearchResult[]>]> = [];

    // Every Super Admin role already sees Organisations/Relationships/Fleet/Operations/Compliance
    // (SUPER_ADMIN_ROLES on those controllers) — mirrored here as "everyone with a platform role".
    tasks.push([
      "Organisation",
      this.prisma.organisation
        .findMany({
          where: { OR: [{ legalName: insensitive }, { displayName: insensitive }, { globalOrgId: insensitive }] },
          take: PER_TYPE_LIMIT,
        })
        .then((rows) => rows.map((o) => ({ type: "Organisation", id: o.id, label: o.displayName, sublabel: `${o.globalOrgId} · ${o.roles.join("/")}`, url: `/organisations/${o.id}` }))),
    ]);

    tasks.push([
      "Driver",
      this.prisma.driver
        .findMany({
          where: { OR: [{ fullName: insensitive }, { phone: insensitive }, { globalDriverId: insensitive }] },
          take: PER_TYPE_LIMIT,
        })
        .then((rows) => rows.map((d) => ({ type: "Driver", id: d.id, label: d.fullName, sublabel: `${d.globalDriverId} · ${d.phone}`, url: `/fleet?tab=drivers&q=${encodeURIComponent(d.globalDriverId)}` }))),
    ]);

    tasks.push([
      "Vehicle",
      this.prisma.vehicle
        .findMany({
          where: { OR: [{ registrationNo: insensitive }, { globalVehicleId: insensitive }, { make: insensitive }, { model: insensitive }] },
          take: PER_TYPE_LIMIT,
        })
        .then((rows) => rows.map((v) => ({ type: "Vehicle", id: v.id, label: v.registrationNo, sublabel: `${v.globalVehicleId} · ${[v.make, v.model].filter(Boolean).join(" ")}`, url: `/fleet?tab=vehicles&q=${encodeURIComponent(v.globalVehicleId)}` }))),
    ]);

    tasks.push([
      "Guard",
      this.prisma.guard
        .findMany({
          where: { OR: [{ fullName: insensitive }, { phone: insensitive }, { globalGuardId: insensitive }] },
          take: PER_TYPE_LIMIT,
        })
        .then((rows) => rows.map((g) => ({ type: "Guard", id: g.id, label: g.fullName, sublabel: `${g.globalGuardId} · ${g.phone}`, url: `/fleet?tab=guards&q=${encodeURIComponent(g.globalGuardId)}` }))),
    ]);

    tasks.push([
      "Employee",
      this.prisma.employee
        .findMany({
          where: { OR: [{ fullName: insensitive }, { phone: insensitive }, { employeeCode: insensitive }, { email: insensitive }] },
          take: PER_TYPE_LIMIT,
          include: { organisation: { select: { displayName: true } } },
        })
        .then((rows) => rows.map((e) => ({ type: "Employee", id: e.id, label: e.fullName, sublabel: `${e.employeeCode} · ${e.organisation.displayName}`, url: `/organisations/${e.corporateOrgId}` }))),
    ]);

    tasks.push([
      "Trip",
      this.prisma.trip
        .findMany({
          where: { globalTripId: insensitive },
          take: PER_TYPE_LIMIT,
          include: { corporateOrg: { select: { displayName: true } } },
        })
        .then((rows) => rows.map((t) => ({ type: "Trip", id: t.id, label: t.globalTripId, sublabel: `${t.status} · ${t.corporateOrg.displayName}`, url: `/operations?tripId=${t.id}` }))),
    ]);

    tasks.push([
      "Incident",
      this.prisma.incident
        .findMany({
          where: { description: insensitive },
          take: PER_TYPE_LIMIT,
        })
        .then((rows) => rows.map((i) => ({ type: "Incident", id: i.id, label: `${i.category} — ${i.severity}`, sublabel: `${i.status}${i.description ? " · " + i.description.slice(0, 60) : ""}`, url: `/operations?incidentId=${i.id}` })))
        .catch(() => []),
    ]);

    tasks.push([
      "Invoice",
      this.prisma.invoice
        .findMany({
          where: { OR: [{ vendorOrgId: insensitive }, { corporateOrgId: insensitive }] },
          take: PER_TYPE_LIMIT,
        })
        .then((rows) => rows.map((i) => ({ type: "Invoice", id: i.id, label: `Invoice ${i.id.slice(0, 8)}`, sublabel: `${i.status} · ${i.paymentStatus}`, url: `/reports?invoiceId=${i.id}` }))),
    ]);

    // Support cases: same SUPER_ADMIN_ROLES visibility as PlatformSupportController.
    tasks.push([
      "SupportCase",
      this.prisma.supportCase
        .findMany({
          where: { OR: [{ ticketNo: insensitive }, { description: insensitive }] },
          take: PER_TYPE_LIMIT,
        })
        .then((rows) => rows.map((c) => ({ type: "SupportCase", id: String(c.seq), label: c.ticketNo, sublabel: `${c.category} · ${c.status}`, url: `/support?seq=${c.seq}` }))),
    ]);

    // Users: same USER_MANAGEMENT_ROLES-flavoured visibility isn't required for read — mirror SUPER_ADMIN_ROLES (dashboard-level).
    tasks.push([
      "User",
      this.prisma.user
        .findMany({
          where: { OR: [{ displayName: insensitive }, { email: insensitive }, { phone: insensitive }] },
          take: PER_TYPE_LIMIT,
        })
        .then((rows) => rows.map((u) => ({ type: "User", id: u.id, label: u.displayName, sublabel: u.email ?? u.phone ?? "", url: `/users?userId=${u.id}` }))),
    ]);

    // Audit events: gated to AUDIT_VIEW_ROLES only, mirroring PlatformAuditController exactly.
    if (AUDIT_VIEW_ROLES.includes(asRole)) {
      tasks.push([
        "AuditEvent",
        this.prisma.auditLog
          .findMany({
            where: { OR: [{ action: insensitive }, { resourceType: insensitive }, { resourceId: insensitive }] },
            take: PER_TYPE_LIMIT,
            orderBy: { createdAt: "desc" },
          })
          .then((rows) => rows.map((a) => ({ type: "AuditEvent", id: a.id, label: a.action, sublabel: `${a.resourceType}${a.resourceId ? " · " + a.resourceId : ""}`, url: `/audit-log?entryId=${a.id}` }))),
      ]);
    }

    const results: Record<string, SearchResult[]> = {};
    const settled = await Promise.all(tasks.map(async ([key, task]) => [key, await task.catch(() => [])] as const));
    for (const [key, rows] of settled) {
      if (rows.length > 0) results[key] = rows;
    }
    return results;
  }
}
