import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

/**
 * Covers the driver mobile-app login path: a vendor admin onboards the
 * driver first (create), then the driver claims their own login by
 * re-proving identity (global driver ID + phone), gets a DRIVER-role
 * session scoped to that vendor org, and can see only their own trips.
 */
describe("Driver account: vendor onboarding -> claim account -> login -> own-trip access", () => {
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
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${vendorAdminToken}`)
      .send({ fullName: "Mobile Driver", phone, licenceNumber: "DL-123" });
    expect(createRes.status).toBe(201);
    const globalDriverId = createRes.body.globalDriverId;
    const driverId = createRes.body.id;

    // Wrong phone is rejected.
    const badClaim = await request(app.getHttpServer()).post("/v1/drivers/claim-account").send({
      globalDriverId,
      phone: "0000000000",
      email: `bad-${Date.now()}@example.com`,
      password: "Password123!",
    });
    expect(badClaim.status).toBe(400);

    const email = `mobile-drv-${Date.now()}@example.com`;
    const claimRes = await request(app.getHttpServer()).post("/v1/drivers/claim-account").send({
      globalDriverId,
      phone,
      email,
      password: "Password123!",
    });
    expect(claimRes.status).toBe(201);
    expect(claimRes.body.accessToken).toBeDefined();
    expect(claimRes.body.role).toBe("DRIVER");

    // Claiming twice is rejected.
    const doubleClaim = await request(app.getHttpServer()).post("/v1/drivers/claim-account").send({
      globalDriverId,
      phone,
      email: `second-${Date.now()}@example.com`,
      password: "Password123!",
    });
    expect(doubleClaim.status).toBe(409);

    const driverToken = await login(email, "Password123!");
    const meRes = await request(app.getHttpServer()).get("/v1/drivers/me").set("Authorization", `Bearer ${driverToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe(driverId);

    // Set up a trip today, assign this driver to it.
    const shift = await prisma.shift.create({
      data: { corporateOrgId: corporate.organisation.id, name: "Morning", startTime: "09:00", endTime: "10:00" },
    });
    const trip = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-DRV-${Date.now()}`,
        corporateOrgId: corporate.organisation.id,
        vendorOrgId: vendor.organisation.id,
        shiftId: shift.id,
        scheduledStartAt: new Date(),
        status: "RESOURCES_ASSIGNED",
        assignments: { create: { driverId, status: "ACTIVE", source: "MANUAL" } },
      },
      include: { assignments: true },
    });
    const assignmentId = trip.assignments[0].id;

    const myTripsRes = await request(app.getHttpServer())
      .get("/v1/drivers/me/trips/today")
      .set("Authorization", `Bearer ${driverToken}`);
    expect(myTripsRes.status).toBe(200);
    expect(myTripsRes.body.some((a: { id: string }) => a.id === assignmentId)).toBe(true);

    // A second driver, unrelated to this trip, sees no trips today.
    const phone2 = `8${Date.now()}`;
    const createRes2 = await request(app.getHttpServer())
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${vendorAdminToken}`)
      .send({ fullName: "Other Driver", phone: phone2 });
    const email2 = `mobile-drv-2-${Date.now()}@example.com`;
    await request(app.getHttpServer()).post("/v1/drivers/claim-account").send({
      globalDriverId: createRes2.body.globalDriverId,
      phone: phone2,
      email: email2,
      password: "Password123!",
    });
    const driverToken2 = await login(email2, "Password123!");
    const otherTripsRes = await request(app.getHttpServer())
      .get("/v1/drivers/me/trips/today")
      .set("Authorization", `Bearer ${driverToken2}`);
    expect(otherTripsRes.status).toBe(200);
    expect(otherTripsRes.body.length).toBe(0);

    // The driver can use the generic trip transition endpoint (scoped by vendor org).
    const transitionRes = await request(app.getHttpServer())
      .post(`/v1/trips/${trip.id}/transition`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ status: "DRIVER_ACCEPTED" });
    expect(transitionRes.status).toBe(201);

    // The driver can look up (but not see the code of) a passenger's pending OTP, then verify it.
    const employee = await prisma.employee.create({
      data: { corporateOrgId: corporate.organisation.id, employeeCode: `EMP-${Date.now()}`, fullName: "Rider", phone: `7${Date.now()}` },
    });
    const tripEmployee = await prisma.tripEmployee.create({ data: { tripId: trip.id, employeeId: employee.id, status: "PLANNED" } });
    const generateRes = await request(app.getHttpServer())
      .post("/v1/otp-challenges")
      .set("Authorization", `Bearer ${vendorAdminToken}`)
      .send({ tripEmployeeId: tripEmployee.id, purpose: "PICKUP" });
    expect(generateRes.status).toBe(201);

    const pendingRes = await request(app.getHttpServer())
      .get(`/v1/otp-challenges/pending?tripEmployeeId=${tripEmployee.id}&purpose=PICKUP`)
      .set("Authorization", `Bearer ${driverToken}`);
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.otpChallengeId).toBe(generateRes.body.otpChallengeId);
    expect(pendingRes.body.code).toBeUndefined();

    const verifyRes = await request(app.getHttpServer())
      .post(`/v1/otp-challenges/${pendingRes.body.otpChallengeId}/verify`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ code: generateRes.body.code });
    expect(verifyRes.status).toBe(201);
    expect(verifyRes.body.verified).toBe(true);
  });
});
