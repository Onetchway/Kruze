import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

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

  async addLine(invoiceId: string, input: { tripId: string; claimedAmount: number }) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

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
        invoiceId,
        tripId: input.tripId,
        claimedAmount: input.claimedAmount,
        approvedAmount,
        varianceAmount,
        status,
      },
    });
  }

  async disputeLine(lineId: string, reason: string) {
    return this.prisma.invoiceLine.update({
      where: { id: lineId },
      data: { status: "DISPUTED", disputeReason: reason },
    });
  }

  async approveLine(lineId: string) {
    return this.prisma.invoiceLine.update({ where: { id: lineId }, data: { status: "APPROVED" } });
  }

  async submit(invoiceId: string) {
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

  async approve(invoiceId: string) {
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
}
