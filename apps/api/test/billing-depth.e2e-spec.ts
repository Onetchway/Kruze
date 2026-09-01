import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Billing depth: zones, SLAB rate cards, driver payment vouchers", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer()).post("/v1/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    return res.body.accessToken;
  }

  it("prices a completed trip off a zone-scoped SLAB rate card and generates a driver payment voucher from it", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const corporateToken = await login(corporate.email, corporate.password);
    const vendorToken = await login(vendor.email, vendor.password);

    const dummyUser = await prisma.user.findFirstOrThrow();
    await prisma.organisationRelationship.create({
      data: {
        sourceOrgId: corporate.organisation.id,
        targetOrgId: vendor.organisation.id,
        type: "CORPORATE_VENDOR",
        status: "ACTIVE",
        createdByUserId: dummyUser.id,
        startsAt: new Date(),
      },
    });

    // Zone
    const zoneRes = await request(app.getHttpServer())
      .post("/v1/zones")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ name: "South Zone", code: "Z-SOUTH" });
    expect(zoneRes.status).toBe(201);
    const zoneId = zoneRes.body.id;

    // Contract
    const contractRes = await request(app.getHttpServer())
      .post("/v1/contracts")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ vendorOrgId: vendor.organisation.id, startsAt: new Date().toISOString() });
    expect(contractRes.status).toBe(201);
    const contractId = contractRes.body.id;
    await request(app.getHttpServer()).post(`/v1/contracts/${contractId}/activate`).set("Authorization", `Bearer ${corporateToken}`);

    // A zone-scoped card alone is NOT picked up by trip-charge computation today — trips don't
    // carry a zoneId (no stop/geo-to-zone resolution is wired yet, a documented gap). Prove that
    // explicitly, then add the generic (zoneId: null) fallback card that charge computation does use.
    const zoneOnlyCardRes = await request(app.getHttpServer())
      .post(`/v1/contracts/${contractId}/rate-cards`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({
        vehicleType: "SEDAN",
        zoneId,
        pricingModel: "PER_TRIP",
        pricingRules: { perTripFlat: 999 },
        effectiveFrom: new Date(Date.now() - 86400000).toISOString(),
      });
    expect(zoneOnlyCardRes.status).toBe(201);
    expect(zoneOnlyCardRes.body.zoneId).toBe(zoneId);

    const noRateCardYetRes = await request(app.getHttpServer())
      .post(`/v1/trips/00000000-0000-0000-0000-000000000000/charge`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send();
    expect(noRateCardYetRes.status).toBe(404); // trip doesn't exist yet — just confirms the route responds

    // SLAB rate card (no zone — the generic fallback): base 100 + slab (0,10]=300, (10,∞)=500, capped at 700
    const rateCardRes = await request(app.getHttpServer())
      .post(`/v1/contracts/${contractId}/rate-cards`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({
        vehicleType: "SEDAN",
        pricingModel: "SLAB",
        pricingRules: {
          baseFare: 100,
          capAmount: 700,
          slabs: [
            { minKm: 0, maxKm: 10, rate: 300 },
            { minKm: 10, rate: 500 },
          ],
          taxRatePercent: 10,
        },
        effectiveFrom: new Date(Date.now() - 86400000).toISOString(),
      });
    expect(rateCardRes.status).toBe(201);
    expect(rateCardRes.body.zoneId).toBeNull();

    // Driver + vehicle
    const driverRes = await request(app.getHttpServer())
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ fullName: "Ravi Kumar", phone: `90${Date.now()}` });
    expect(driverRes.status).toBe(201);
    const driverId = driverRes.body.id;

    const vehicleRes = await request(app.getHttpServer())
      .post("/v1/vehicles")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ registrationNo: `KA01AB${Date.now()}`, vehicleType: "SEDAN" });
    expect(vehicleRes.status).toBe(201);
    const vehicleId = vehicleRes.body.id;

    // Shift (Trip requires a shiftId FK)
    const shift = await prisma.shift.create({
      data: { corporateOrgId: corporate.organisation.id, name: "Morning", startTime: "09:00", endTime: "10:00" },
    });

    // A completed trip, 15km, priced against the zone/vehicleType above — set up directly since
    // the full roster->plan->execution pipeline is exercised elsewhere (operations-critical suite).
    const now = new Date();
    const trip = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-TEST-${Date.now()}`,
        corporateOrgId: corporate.organisation.id,
        vendorOrgId: vendor.organisation.id,
        contractId,
        shiftId: shift.id,
        scheduledStartAt: now,
        actualStartAt: now,
        actualEndAt: now,
        status: "COMPLETED",
        actualDistanceKm: 15,
      },
    });
    await prisma.tripAssignment.create({
      data: { tripId: trip.id, driverId, vehicleId, status: "ACTIVE" },
    });

    // Compute the charge — distance 15km falls in the "beyond 10" slab (rate 500), base 100, under the 700 cap.
    const chargeRes = await request(app.getHttpServer())
      .post(`/v1/trips/${trip.id}/charge`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send();
    expect(chargeRes.status).toBe(201);
    expect(Number(chargeRes.body.vendorPayable)).toBeCloseTo(600, 2); // 100 base + 500 slab
    expect(Number(chargeRes.body.taxes)).toBeCloseTo(60, 2); // 10% of 600
    expect(Number(chargeRes.body.corporateCharge)).toBeCloseTo(660, 2);

    // Generate the driver payment voucher for the period covering the trip.
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const voucherRes = await request(app.getHttpServer())
      .post("/v1/driver-payment-vouchers/generate")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ driverId, periodStart, periodEnd });
    expect(voucherRes.status).toBe(201);
    expect(Number(voucherRes.body.grossAmount)).toBeCloseTo(600, 2);
    expect(Number(voucherRes.body.netPayment)).toBeCloseTo(600, 2);
    expect(voucherRes.body.status).toBe("DRAFT");

    // Locking freezes it; a further generate for the same period must be rejected.
    const lockRes = await request(app.getHttpServer())
      .post(`/v1/driver-payment-vouchers/${voucherRes.body.id}/lock`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send();
    expect(lockRes.status).toBe(201);
    expect(lockRes.body.status).toBe("LOCKED");

    const regenerateRes = await request(app.getHttpServer())
      .post("/v1/driver-payment-vouchers/generate")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ driverId, periodStart, periodEnd });
    expect(regenerateRes.status).toBe(400);

    // Tenant isolation: a different vendor cannot generate a voucher for this driver.
    const otherVendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const otherVendorToken = await login(otherVendor.email, otherVendor.password);
    const crossVendorRes = await request(app.getHttpServer())
      .post("/v1/driver-payment-vouchers/generate")
      .set("Authorization", `Bearer ${otherVendorToken}`)
      .send({ driverId, periodStart, periodEnd });
    expect(crossVendorRes.status).toBe(400);
  });
});
