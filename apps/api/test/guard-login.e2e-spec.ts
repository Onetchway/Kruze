import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

/**
 * Covers the guard mobile-app login path — the same claim-account shape as
 * driver-login.e2e-spec.ts, but the guard app is read-only on trips (no
 * status transition; that stays the driver's responsibility).
 */
describe("Guard account: vendor onboarding -> claim account -> login -> own-trip access", () => {
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

  it("full lifecycle", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const vendorAdminToken = await login(vendor.email, vendor.password);

    const phone = `9${Date.now()}`;
    const createRes = await request(app.getHttpServer())
      .post("/v1/guards")
      .set("Authorization", `Bearer ${vendorAdminToken}`)
      .send({ fullName: "Mobile Guard", phone });
    expect(createRes.status).toBe(201);
    const globalGuardId = createRes.body.globalGuardId;
    const guardId = createRes.body.id;

    // Wrong phone is rejected.
    const badClaim = await request(app.getHttpServer()).post("/v1/guards/claim-account").send({
      globalGuardId,
      phone: "0000000000",
      email: `bad-${Date.now()}@example.com`,
      password: "Password123!",
    });
    expect(badClaim.status).toBe(400);

    const email = `mobile-grd-${Date.now()}@example.com`;
    const claimRes = await request(app.getHttpServer()).post("/v1/guards/claim-account").send({
      globalGuardId,
      phone,
      email,
      password: "Password123!",
    });
    expect(claimRes.status).toBe(201);
    expect(claimRes.body.accessToken).toBeDefined();
    expect(claimRes.body.role).toBe("GUARD");

    // Claiming twice is rejected.
    const doubleClaim = await request(app.getHttpServer()).post("/v1/guards/claim-account").send({
      globalGuardId,
      phone,
      email: `second-${Date.now()}@example.com`,
      password: "Password123!",
    });
    expect(doubleClaim.status).toBe(409);

    const guardToken = await login(email, "Password123!");
    const meRes = await request(app.getHttpServer()).get("/v1/guards/me").set("Authorization", `Bearer ${guardToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe(guardId);

    // Set up a trip today, assign this guard to it.
    const shift = await prisma.shift.create({
      data: { corporateOrgId: corporate.organisation.id, name: "Morning", startTime: "09:00", endTime: "10:00" },
    });
    const trip = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-GRD-${Date.now()}`,
        corporateOrgId: corporate.organisation.id,
        vendorOrgId: vendor.organisation.id,
        shiftId: shift.id,
        scheduledStartAt: new Date(),
        status: "RESOURCES_ASSIGNED",
        assignments: { create: { guardId, status: "ACTIVE", source: "MANUAL" } },
      },
      include: { assignments: true },
    });
    const assignmentId = trip.assignments[0].id;

    const myTripsRes = await request(app.getHttpServer())
      .get("/v1/guards/me/trips/today")
      .set("Authorization", `Bearer ${guardToken}`);
    expect(myTripsRes.status).toBe(200);
    expect(myTripsRes.body.some((a: { id: string }) => a.id === assignmentId)).toBe(true);

    // A second guard, unrelated to this trip, sees no trips today.
    const phone2 = `8${Date.now()}`;
    const createRes2 = await request(app.getHttpServer())
      .post("/v1/guards")
      .set("Authorization", `Bearer ${vendorAdminToken}`)
      .send({ fullName: "Other Guard", phone: phone2 });
    const email2 = `mobile-grd-2-${Date.now()}@example.com`;
    await request(app.getHttpServer()).post("/v1/guards/claim-account").send({
      globalGuardId: createRes2.body.globalGuardId,
      phone: phone2,
      email: email2,
      password: "Password123!",
    });
    const guardToken2 = await login(email2, "Password123!");
    const otherTripsRes = await request(app.getHttpServer())
      .get("/v1/guards/me/trips/today")
      .set("Authorization", `Bearer ${guardToken2}`);
    expect(otherTripsRes.status).toBe(200);
    expect(otherTripsRes.body.length).toBe(0);

    // The guard can raise an SOS on their assigned trip.
    const sosRes = await request(app.getHttpServer())
      .post("/v1/sos")
      .set("Authorization", `Bearer ${guardToken}`)
      .send({ tripId: trip.id, description: "Test SOS" });
    expect(sosRes.status).toBe(201);
  });
});
