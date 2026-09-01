import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Operational MIS: periodic driver payment vouchers, generated from the
 * vendorPayable side of each of that driver's completed trips' TripCharge
 * for the vendor within the period (spec: driver payment vouchers /
 * "Operational MIS"). Deliberately reuses the existing billing engine's
 * TripCharge rather than a second, parallel pricing computation.
 */
@Injectable()
export class DriverPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(vendorOrgId: string, input: { driverId: string; periodStart: string; periodEnd: string }) {
    const relationship = await this.prisma.driverVendorRelationship.findUnique({
      where: { driverId_vendorOrgId: { driverId: input.driverId, vendorOrgId } },
    });
    if (!relationship || relationship.status !== "ACTIVE") {
      throw new BadRequestException("Driver has no active relationship with this vendor");
    }

    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    const assignments = await this.prisma.tripAssignment.findMany({
      where: {
        driverId: input.driverId,
        status: "ACTIVE",
        trip: {
          vendorOrgId,
          status: "COMPLETED",
          actualEndAt: { gte: periodStart, lte: periodEnd },
        },
      },
      include: { trip: { include: { tripCharge: true } } },
    });

    const grossAmount = assignments.reduce((sum, a) => sum + Number(a.trip.tripCharge?.vendorPayable ?? 0), 0);

    const existing = await this.prisma.driverPaymentVoucher.findUnique({
      where: {
        vendorOrgId_driverId_periodStart_periodEnd: { vendorOrgId, driverId: input.driverId, periodStart, periodEnd },
      },
    });
    if (existing && existing.status !== "DRAFT") {
      throw new BadRequestException(`Voucher for this period is already ${existing.status} and cannot be regenerated`);
    }

    const deductions = existing?.deductions ?? 0;
    return this.prisma.driverPaymentVoucher.upsert({
      where: {
        vendorOrgId_driverId_periodStart_periodEnd: { vendorOrgId, driverId: input.driverId, periodStart, periodEnd },
      },
      create: {
        vendorOrgId,
        driverId: input.driverId,
        periodStart,
        periodEnd,
        grossAmount,
        deductions,
        netPayment: grossAmount - Number(deductions),
      },
      update: {
        grossAmount,
        netPayment: grossAmount - Number(deductions),
      },
    });
  }

  listForVendor(vendorOrgId: string) {
    return this.prisma.driverPaymentVoucher.findMany({
      where: { vendorOrgId },
      include: { driver: true },
      orderBy: { periodStart: "desc" },
    });
  }

  async lock(vendorOrgId: string, id: string) {
    const voucher = await this.getOwned(vendorOrgId, id);
    if (voucher.status !== "DRAFT") {
      throw new BadRequestException(`Voucher is not DRAFT (status=${voucher.status})`);
    }
    return this.prisma.driverPaymentVoucher.update({ where: { id }, data: { status: "LOCKED" } });
  }

  private async getOwned(vendorOrgId: string, id: string) {
    const voucher = await this.prisma.driverPaymentVoucher.findUnique({ where: { id } });
    if (!voucher || voucher.vendorOrgId !== vendorOrgId) {
      throw new NotFoundException("Voucher not found");
    }
    return voucher;
  }
}
