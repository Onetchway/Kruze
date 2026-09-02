import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";

const VARIANCE_TOLERANCE = 0.01;

/**
 * Reconciliation compares what the vendor claims against the validated
 * trip-charge (GPS/OTP-backed, rate-card-derived) computed independently
 * by billing — never the vendor's own number taken on trust (spec §25).
 */
@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  createInvoice(corporateOrgId: string, input: { vendorOrgId: string; periodStart: string; periodEnd: string }) {
    return this.prisma.invoice.create({
      data: {
        vendorOrgId: input.vendorOrgId,
        corporateOrgId,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
        status: "DRAFT",
      },
    });
  }

  async addLine(actor: AuthenticatedUser, invoiceId: string, input: { tripId: string; claimedAmount: number }) {
    const invoice = await this.getOwnedInvoice(actor, invoiceId);

    const tripCharge = await this.prisma.tripCharge.findUnique({ where: { tripId: input.tripId } });

    let status: "PENDING" | "MATCHED" | "VARIANCE" = "PENDING";
    let approvedAmount: number | undefined;
    let varianceAmount: number | undefined;

    if (tripCharge) {
      const validated = Number(tripCharge.vendorPayable);
      const diff = Math.abs(validated - input.claimedAmount);
      if (diff <= VARIANCE_TOLERANCE) {
        status = "MATCHED";
        approvedAmount = validated;
      } else {
        status = "VARIANCE";
        approvedAmount = validated;
        varianceAmount = input.claimedAmount - validated;
      }
    }

    return this.prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        tripId: input.tripId,
        claimedAmount: input.claimedAmount,
        approvedAmount,
        varianceAmount,
        status,
      },
    });
  }

  async disputeLine(actor: AuthenticatedUser, lineId: string, reason: string) {
    await this.getOwnedInvoiceForLine(actor, lineId);
    return this.prisma.invoiceLine.update({
      where: { id: lineId },
      data: { status: "DISPUTED", disputeReason: reason },
    });
  }

  async approveLine(actor: AuthenticatedUser, lineId: string) {
    const invoice = await this.getOwnedInvoiceForLine(actor, lineId);
    if (invoice.corporateOrgId !== actor.organisationId) {
      throw new ForbiddenException("Only the invoice's corporate may approve a line");
    }
    return this.prisma.invoiceLine.update({ where: { id: lineId }, data: { status: "APPROVED" } });
  }

  async submit(actor: AuthenticatedUser, invoiceId: string) {
    await this.getOwnedInvoice(actor, invoiceId);
    const lines = await this.prisma.invoiceLine.findMany({ where: { invoiceId } });
    if (lines.length === 0) {
      throw new BadRequestException("Cannot submit an invoice with no lines");
    }
    const claimedTotal = lines.reduce((sum, l) => sum + Number(l.claimedAmount), 0);
    const validatedTotal = lines.reduce((sum, l) => sum + Number(l.approvedAmount ?? l.claimedAmount), 0);

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "SUBMITTED", claimedTotal, validatedTotal },
    });
  }

  async approve(actor: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.getOwnedInvoice(actor, invoiceId);
    if (invoice.corporateOrgId !== actor.organisationId) {
      throw new ForbiddenException("Only the invoice's corporate may approve it");
    }
    const disputed = await this.prisma.invoiceLine.count({ where: { invoiceId, status: "DISPUTED" } });
    if (disputed > 0) {
      throw new BadRequestException("Cannot approve an invoice with unresolved disputed lines");
    }
    return this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: "APPROVED" } });
  }

  listForOrganisation(organisationId: string) {
    return this.prisma.invoice.findMany({
      where: { OR: [{ vendorOrgId: organisationId }, { corporateOrgId: organisationId }] },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async setPaymentStatus(
    actor: AuthenticatedUser,
    invoiceId: string,
    input: { paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID"; paidAmount?: number },
  ) {
    const invoice = await this.getOwnedInvoice(actor, invoiceId);
    if (invoice.corporateOrgId !== actor.organisationId) {
      throw new ForbiddenException("Only the invoice's corporate may record payment");
    }
    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentStatus: input.paymentStatus, paidAmount: input.paidAmount },
    });
  }

  /**
   * Amounts owed per vendor: approved invoice-line totals grouped by
   * vendor, netted against what's already recorded as paid — powers the
   * dedicated Vendor Payables screen (spec §12).
   */
  async vendorPayablesSummary(corporateOrgId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { corporateOrgId, status: { in: ["APPROVED", "SUBMITTED"] } },
      include: { lines: true },
    });

    const byVendor = new Map<string, { vendorOrgId: string; approvedTotal: number; paidTotal: number; invoiceCount: number }>();
    for (const invoice of invoices) {
      const approvedTotal = invoice.lines.reduce((sum, l) => sum + Number(l.approvedAmount ?? 0), 0);
      const entry = byVendor.get(invoice.vendorOrgId) ?? { vendorOrgId: invoice.vendorOrgId, approvedTotal: 0, paidTotal: 0, invoiceCount: 0 };
      entry.approvedTotal += approvedTotal;
      entry.paidTotal += Number(invoice.paidAmount ?? 0);
      entry.invoiceCount += 1;
      byVendor.set(invoice.vendorOrgId, entry);
    }

    const vendorOrgIds = Array.from(byVendor.keys());
    const vendors = vendorOrgIds.length
      ? await this.prisma.organisation.findMany({ where: { id: { in: vendorOrgIds } }, select: { id: true, displayName: true, globalOrgId: true } })
      : [];
    const vendorById = new Map(vendors.map((v) => [v.id, v]));

    return Array.from(byVendor.values()).map((row) => ({
      ...row,
      outstanding: row.approvedTotal - row.paidTotal,
      vendor: vendorById.get(row.vendorOrgId) ?? null,
    }));
  }

  private async getOwnedInvoice(actor: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    if (invoice.corporateOrgId !== actor.organisationId && invoice.vendorOrgId !== actor.organisationId) {
      throw new NotFoundException("Invoice not found");
    }
    return invoice;
  }

  private async getOwnedInvoiceForLine(actor: AuthenticatedUser, lineId: string) {
    const line = await this.prisma.invoiceLine.findUnique({ where: { id: lineId }, include: { invoice: true } });
    if (!line) {
      throw new NotFoundException("Invoice line not found");
    }
    if (line.invoice.corporateOrgId !== actor.organisationId && line.invoice.vendorOrgId !== actor.organisationId) {
      throw new NotFoundException("Invoice line not found");
    }
    return line.invoice;
  }
}
