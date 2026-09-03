import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import {
  AddSupportCaseEventDto,
  AssignSupportCaseDto,
  ChangeSupportCaseStatusDto,
  CreateSupportCaseDto,
} from "./dto/support-case.dto";

/** Fixed priority → SLA-target-hours mapping — an easy default, not a configurable SLA policy engine. */
const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  URGENT: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

const CASE_INCLUDE = {
  organisation: { select: { id: true, globalOrgId: true, displayName: true } },
} as const;

/**
 * Super-Admin-side support ticket management (spec §55). This is the
 * management surface only — no corporate/vendor/employee "raise a ticket"
 * submission flow exists yet; `reportedByUserId`/`organisationId` are
 * optional so a Super Admin can log a case on a reporter's behalf.
 */
@Injectable()
export class PlatformSupportService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { status?: string; category?: string; priority?: string; organisationId?: string } = {}) {
    const { status, category, priority, organisationId } = params;
    return this.prisma.supportCase.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(category ? { category: category as never } : {}),
        ...(priority ? { priority: priority as never } : {}),
        ...(organisationId ? { organisationId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: CASE_INCLUDE,
    });
  }

  async get(seq: number) {
    const supportCase = await this.prisma.supportCase.findUnique({
      where: { seq },
      include: { ...CASE_INCLUDE, events: { orderBy: { createdAt: "asc" } } },
    });
    if (!supportCase) throw new NotFoundException("Support case not found");
    return supportCase;
  }

  async create(dto: CreateSupportCaseDto, actorUserId?: string) {
    const priority = dto.priority ?? "MEDIUM";
    const created = await this.prisma.supportCase.create({
      data: {
        // Placeholder — replaced below once the autoincrement `seq` is known.
        ticketNo: `TMP-${randomUUID()}`,
        organisationId: dto.organisationId,
        reportedByUserId: dto.reportedByUserId,
        category: dto.category as never,
        priority: priority as never,
        slaTargetHours: SLA_HOURS_BY_PRIORITY[priority],
        description: dto.description,
      },
    });
    const ticketNo = `CASE-${String(created.seq).padStart(6, "0")}`;
    const supportCase = await this.prisma.supportCase.update({
      where: { seq: created.seq },
      data: { ticketNo },
      include: CASE_INCLUDE,
    });
    await this.prisma.supportCaseEvent.create({
      data: { caseId: created.seq, authorUserId: actorUserId, message: "Case created" },
    });
    return supportCase;
  }

  async changeStatus(seq: number, dto: ChangeSupportCaseStatusDto, actorUserId?: string) {
    const existing = await this.get(seq);
    const supportCase = await this.prisma.supportCase.update({
      where: { seq },
      data: { status: dto.status as never },
      include: CASE_INCLUDE,
    });
    await this.prisma.supportCaseEvent.create({
      data: {
        caseId: seq,
        authorUserId: actorUserId,
        message: dto.note ? `Status: ${existing.status} → ${dto.status} — ${dto.note}` : `Status: ${existing.status} → ${dto.status}`,
      },
    });
    return supportCase;
  }

  async assign(seq: number, dto: AssignSupportCaseDto, actorUserId?: string) {
    await this.get(seq);
    const supportCase = await this.prisma.supportCase.update({
      where: { seq },
      data: { assigneeUserId: dto.assigneeUserId, status: "ASSIGNED" },
      include: CASE_INCLUDE,
    });
    await this.prisma.supportCaseEvent.create({
      data: { caseId: seq, authorUserId: actorUserId, message: `Assigned to user ${dto.assigneeUserId}` },
    });
    return supportCase;
  }

  async addEvent(seq: number, dto: AddSupportCaseEventDto, actorUserId?: string) {
    await this.get(seq);
    return this.prisma.supportCaseEvent.create({
      data: { caseId: seq, authorUserId: actorUserId, message: dto.message },
    });
  }

  async summary() {
    const byStatus = await this.prisma.supportCase.groupBy({ by: ["status"], _count: { _all: true } });
    const byPriority = await this.prisma.supportCase.groupBy({ by: ["priority"], _count: { _all: true } });
    return {
      total: byStatus.reduce((sum, r) => sum + r._count._all, 0),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
      byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r._count._all])),
    };
  }
}
