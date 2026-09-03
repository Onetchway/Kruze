import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

/**
 * Global, platform-wide read visibility into Drivers/Vehicles/Guards
 * (spec §27: Fleet & Resources) — reuses the global identity tables that
 * already back every vendor-scoped list (DriverService.listForVendor and
 * friends), just without the vendor/corporate scoping filter, plus
 * Block/Suspend/Unblock actions a Super Admin may take platform-wide.
 */
@Injectable()
export class PlatformFleetService {
  constructor(private readonly prisma: PrismaService) {}

  async listDrivers(params: { q?: string; status?: string; vendorOrgId?: string } = {}) {
    const { q, status, vendorOrgId } = params;
    return this.prisma.driver.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { globalDriverId: { contains: q, mode: "insensitive" } }] } : {}),
        ...(vendorOrgId ? { vendorRelationships: { some: { vendorOrgId } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        vendorRelationships: {
          include: { vendorOrg: { select: { id: true, displayName: true, globalOrgId: true } } },
        },
      },
    });
  }

  async listVehicles(params: { q?: string; status?: string; vendorOrgId?: string } = {}) {
    const { q, status, vendorOrgId } = params;
    return this.prisma.vehicle.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { OR: [{ registrationNo: { contains: q, mode: "insensitive" } }, { globalVehicleId: { contains: q, mode: "insensitive" } }, { make: { contains: q, mode: "insensitive" } }] } : {}),
        ...(vendorOrgId ? { vendorRelationships: { some: { vendorOrgId } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        vendorRelationships: {
          include: { vendorOrg: { select: { id: true, displayName: true, globalOrgId: true } } },
        },
      },
    });
  }

  async listGuards(params: { q?: string; status?: string; vendorOrgId?: string } = {}) {
    const { q, status, vendorOrgId } = params;
    return this.prisma.guard.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { globalGuardId: { contains: q, mode: "insensitive" } }] } : {}),
        ...(vendorOrgId ? { vendorRelationships: { some: { vendorOrgId } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        vendorRelationships: {
          include: { vendorOrg: { select: { id: true, displayName: true, globalOrgId: true } } },
        },
      },
    });
  }

  async summary() {
    const [driversByStatus, vehiclesByStatus, guardsByStatus, driverCount, vehicleCount, guardCount] = await Promise.all([
      this.prisma.driver.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.guard.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.driver.count(),
      this.prisma.vehicle.count(),
      this.prisma.guard.count(),
    ]);
    return {
      drivers: { total: driverCount, byStatus: Object.fromEntries(driversByStatus.map((r) => [r.status, r._count._all])) },
      vehicles: { total: vehicleCount, byStatus: Object.fromEntries(vehiclesByStatus.map((r) => [r.status, r._count._all])) },
      guards: { total: guardCount, byStatus: Object.fromEntries(guardsByStatus.map((r) => [r.status, r._count._all])) },
    };
  }

  private async setDriverStatus(driverId: string, status: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException("Driver not found");
    return this.prisma.driver.update({ where: { id: driverId }, data: { status } });
  }

  blockDriver(driverId: string) {
    return this.setDriverStatus(driverId, "BLOCKED");
  }
  suspendDriver(driverId: string) {
    return this.setDriverStatus(driverId, "SUSPENDED");
  }
  unblockDriver(driverId: string) {
    return this.setDriverStatus(driverId, "ACTIVE");
  }

  private async setVehicleStatus(vehicleId: string, status: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    return this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status } });
  }

  blockVehicle(vehicleId: string) {
    return this.setVehicleStatus(vehicleId, "BLOCKED");
  }
  unblockVehicle(vehicleId: string) {
    return this.setVehicleStatus(vehicleId, "ACTIVE");
  }

  private async setGuardStatus(guardId: string, status: string) {
    const guard = await this.prisma.guard.findUnique({ where: { id: guardId } });
    if (!guard) throw new NotFoundException("Guard not found");
    return this.prisma.guard.update({ where: { id: guardId }, data: { status } });
  }

  blockGuard(guardId: string) {
    return this.setGuardStatus(guardId, "BLOCKED");
  }
  unblockGuard(guardId: string) {
    return this.setGuardStatus(guardId, "ACTIVE");
  }
}
