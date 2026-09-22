import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import { PrismaService } from "../common/prisma/prisma.service";

// Resolved from process.cwd() (apps/api, however the app is started) rather than
// __dirname — nest build's default webpack bundling collapses everything into a
// single dist/main.js, so __dirname-relative paths would land outside apps/api.
const EXPORT_DIR = path.resolve(process.cwd(), "scratch-exports");
const EXPIRY_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_ENTITY_TYPES = ["ORGANISATION", "AUDIT_LOG"] as const;
type SupportedEntityType = (typeof SUPPORTED_ENTITY_TYPES)[number];

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",");
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(","));
  return [header, ...lines].join("\n");
}

/**
 * Data Export system (spec §68) — deliberately minimal per this wave's
 * scope: exports run synchronously (no queue/worker), but the ExportJob
 * row models a real job lifecycle (PENDING -> RUNNING -> COMPLETED/FAILED)
 * so a genuine async worker can replace the synchronous body later without
 * changing what callers see. Files are written locally under a
 * git-ignored scratch directory, not a cloud object store — this stands
 * in for the "expiring signed URL" until real object storage exists.
 */
@Injectable()
export class PlatformExportService {
  constructor(private readonly prisma: PrismaService) {}

  async createExport(requestedByUserId: string, entityType: string) {
    if (!SUPPORTED_ENTITY_TYPES.includes(entityType as SupportedEntityType)) {
      throw new BadRequestException(`Unsupported export entityType. Supported: ${SUPPORTED_ENTITY_TYPES.join(", ")}`);
    }

    const job = await this.prisma.exportJob.create({
      data: { requestedByUserId, entityType, status: "RUNNING" },
    });

    try {
      const { columns, rows } = await this.loadRows(entityType as SupportedEntityType);
      const csv = toCsv(rows, columns);
      await fs.mkdir(EXPORT_DIR, { recursive: true });
      const fileName = `${job.id}.csv`;
      await fs.writeFile(path.join(EXPORT_DIR, fileName), csv, "utf8");

      return this.prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", resultFileKey: fileName, expiresAt: new Date(Date.now() + EXPIRY_MS), completedAt: new Date() },
      });
    } catch (err) {
      return this.prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Export failed" },
      });
    }
  }

  private async loadRows(entityType: SupportedEntityType): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
    if (entityType === "ORGANISATION") {
      const orgs = await this.prisma.organisation.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
      return {
        columns: ["id", "globalOrgId", "legalName", "displayName", "roles", "status", "city", "country", "createdAt"],
        rows: orgs.map((o) => ({ ...o, roles: o.roles.join("|") })),
      };
    }
    // AUDIT_LOG
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { actor: { select: { email: true } }, organisation: { select: { displayName: true } } },
    });
    return {
      columns: ["id", "action", "resourceType", "resourceId", "actorEmail", "organisationName", "createdAt"],
      rows: entries.map((e) => ({
        id: e.id,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        actorEmail: e.actor?.email ?? "",
        organisationName: e.organisation?.displayName ?? "",
        createdAt: e.createdAt,
      })),
    };
  }

  listMine(requestedByUserId: string) {
    return this.prisma.exportJob.findMany({
      where: { requestedByUserId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getDownload(id: string, requestedByUserId: string): Promise<{ fileName: string; filePath: string }> {
    const job = await this.prisma.exportJob.findUnique({ where: { id } });
    if (!job || job.requestedByUserId !== requestedByUserId) {
      throw new NotFoundException("Export job not found");
    }
    if (job.status !== "COMPLETED" || !job.resultFileKey) {
      throw new BadRequestException(`Export is ${job.status.toLowerCase()}, not ready for download`);
    }
    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new BadRequestException("This export's download link has expired — create a new export");
    }
    return { fileName: job.resultFileKey, filePath: path.join(EXPORT_DIR, job.resultFileKey) };
  }
}
