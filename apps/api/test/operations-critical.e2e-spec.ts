import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Critical operational scenarios (spec §28 / §11 / §9 / §25)", () => {
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

  async function activateCorporateVendorRelationship(corporateOrgId: string, vendorOrgId: string) {
    const dummyUser = await prisma.user.findFirstOrThrow();
    return prisma.organisationRelationship.create({
      data: {
        sourceOrgId: corporateOrgId,
        targetOrgId: vendorOrgId,
        type: "CORPORATE_VENDOR",
        status: "ACTIVE",
        createdByUserId: dummyUser.id,
        startsAt: new Date(),
      },
    });
  }

  it("compliance blocks auto-assignment of a non-compliant driver", async () => {
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendorToken = await login(vendor.email, vendor.password);
    const corporateToken = await login(corporate.email, corporate.password);

    // Vendor-scoped blocking rule (scoped so it can't leak into other tests'
    // vendors): every driver of this vendor must have a verified LICENSE document.
    await request(app.getHttpServer())
      .post("/v1/compliance-rules")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ scope: "VENDOR", scopeOrgId: vendor.organisation.id, subjectType: "DRIVER", docType: "LICENSE", severity: "BLOCKING" })
      .expect(201);

    const driverRes = await request(app.getHttpServer())
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ fullName: "No Docs Driver", phone: `+91700${Math.floor(Math.random() * 1_000_000)}` })
      .expect(201);
    const driverId = driverRes.body.id;

    // Set up a trip belonging to this corporate/vendor to assign onto.
    const shift = await prisma.shift.create({
      data: { corporateOrgId: corporate.organisation.id, name: "Morning", startTime: "09:00", endTime: "18:00" },
    });
    const trip = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-TEST-${Math.floor(Math.random() * 1_000_000)}`,
        corporateOrgId: corporate.organisation.id,
        vendorOrgId: vendor.organisation.id,
        shiftId: shift.id,
        scheduledStartAt: new Date(Date.now() + 3600_000),
        status: "CREATED",
      },
    });

    const assignRes = await request(app.getHttpServer())
      .post(`/v1/trips/${trip.id}/assignments`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ driverId, source: "AUTO" });
    expect(assignRes.status).toBe(409);

    // Upload + verify the required document, then assignment must succeed.
    await request(app.getHttpServer())
      .post("/v1/documents")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ entityType: "DRIVER", entityId: driverId, docType: "LICENSE", expiryDate: new Date(Date.now() + 365 * 86400_000).toISOString() })
      .expect(201)
      .then(async (res) => {
        await prisma.document.update({ where: { id: res.body.id }, data: { status: "VERIFIED" } });
      });

    const assignRes2 = await request(app.getHttpServer())
      .post(`/v1/trips/${trip.id}/assignments`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ driverId, source: "AUTO" });
    expect(assignRes2.status).toBe(201);
  });

  it("pickup OTP cannot be verified twice, and is distinct from the drop OTP", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const corporateToken = await login(corporate.email, corporate.password);

    const shift = await prisma.shift.create({
      data: { corporateOrgId: corporate.organisation.id, name: "Morning", startTime: "09:00", endTime: "18:00" },
    });
    const employee = await prisma.employee.create({
      data: {
        corporateOrgId: corporate.organisation.id,
        employeeCode: `E${Math.floor(Math.random() * 1_000_000)}`,
        fullName: "Test Employee",
        phone: `+91600${Math.floor(Math.random() * 1_000_000)}`,
      },
    });
    const trip = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-TEST-${Math.floor(Math.random() * 1_000_000)}`,
        corporateOrgId: corporate.organisation.id,
        shiftId: shift.id,
        scheduledStartAt: new Date(),
        status: "CREATED",
        employees: { create: { employeeId: employee.id, status: "PLANNED" } },
      },
      include: { employees: true },
    });
    const tripEmployeeId = trip.employees[0].id;

    const pickupGen = await request(app.getHttpServer())
      .post("/v1/otp-challenges")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ tripEmployeeId, purpose: "PICKUP" })
      .expect(201);
    const dropGen = await request(app.getHttpServer())
      .post("/v1/otp-challenges")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ tripEmployeeId, purpose: "DROP" })
      .expect(201);

    expect(pickupGen.body.code).not.toBe(dropGen.body.code);

    const verify1 = await request(app.getHttpServer())
      .post(`/v1/otp-challenges/${pickupGen.body.otpChallengeId}/verify`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ code: pickupGen.body.code });
    expect(verify1.status).toBe(201);

    // Reusing the same (now-verified) challenge must fail.
    const verify2 = await request(app.getHttpServer())
      .post(`/v1/otp-challenges/${pickupGen.body.otpChallengeId}/verify`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ code: pickupGen.body.code });
    expect(verify2.status).toBe(400);

    // The drop OTP's code cannot verify the pickup challenge either.
    const dropGen2 = await request(app.getHttpServer())
      .post("/v1/otp-challenges")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ tripEmployeeId, purpose: "DROP" })
      .expect(201);
    const crossVerify = await request(app.getHttpServer())
      .post(`/v1/otp-challenges/${dropGen.body.otpChallengeId}/verify`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ code: dropGen2.body.code });
    expect(crossVerify.status).toBe(400);
  });

  it("mandatory guard rule blocks auto-plan publication with a NO_GUARD_AVAILABLE exception, and republishing versions the plan", async () => {
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendorToken = await login(vendor.email, vendor.password);
    const corporateToken = await login(corporate.email, corporate.password);

    await activateCorporateVendorRelationship(corporate.organisation.id, vendor.organisation.id);

    // Vehicle + driver exist and are compliance-eligible (no rules configured), but no guard exists at all.
    await request(app.getHttpServer())
      .post("/v1/vehicles")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ registrationNo: `KA01AB${Math.floor(Math.random() * 100000)}`, capacity: 6 })
      .expect(201);
    await request(app.getHttpServer())
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ fullName: "Plan Driver", phone: `+91500${Math.floor(Math.random() * 1_000_000)}` })
      .expect(201);

    const policyRes = await request(app.getHttpServer())
      .post("/v1/safety-policies")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ name: "Default Safety Policy" })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/v1/safety-policies/${policyRes.body.id}/rules`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ type: "GUARD_REQUIRED", config: { afterHour: 0 }, mandatory: true })
      .expect(201);

    const shiftRes = await request(app.getHttpServer())
      .post("/v1/shifts")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ name: "Morning", startTime: "09:00", endTime: "18:00" })
      .expect(201);
    const shiftId = shiftRes.body.id;

    const employeeRes = await request(app.getHttpServer())
      .post("/v1/employees")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ employeeCode: `E${Math.floor(Math.random() * 1_000_000)}`, fullName: "Plan Employee", phone: `+91400${Math.floor(Math.random() * 1_000_000)}` })
      .expect(201);

    const planDate = new Date().toISOString().slice(0, 10);
    await request(app.getHttpServer())
      .post("/v1/roster-entries")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ employeeId: employeeRes.body.id, shiftId, date: planDate, status: "OPTED_IN" })
      .expect(201);

    const planRes = await request(app.getHttpServer())
      .post("/v1/plans/generate")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ shiftId, planDate })
      .expect(201);
    expect(planRes.body.status).toBe("EXCEPTIONS");
    expect(planRes.body.version).toBe(1);

    const exceptionsRes = await request(app.getHttpServer())
      .get(`/v1/plans/${planRes.body.id}/exceptions`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .expect(200);
    expect(exceptionsRes.body.some((e: { type: string }) => e.type === "NO_GUARD_AVAILABLE")).toBe(true);

    const publishRes = await request(app.getHttpServer())
      .post(`/v1/plans/${planRes.body.id}/publish`)
      .set("Authorization", `Bearer ${corporateToken}`);
    expect(publishRes.status).toBe(400);

    // Re-running generate for the same shift/date must version, not overwrite.
    const planRes2 = await request(app.getHttpServer())
      .post("/v1/plans/generate")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ shiftId, planDate })
      .expect(201);
    expect(planRes2.body.version).toBe(2);
    expect(planRes2.body.id).not.toBe(planRes.body.id);

    const firstPlanAfter = await prisma.transportPlan.findUniqueOrThrow({ where: { id: planRes.body.id } });
    expect(firstPlanAfter.status).toBe("SUPERSEDED");
  });

  it("a driver cannot be double-booked across overlapping trips", async () => {
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendorToken = await login(vendor.email, vendor.password);
    const corporateToken = await login(corporate.email, corporate.password);

    const driverRes = await request(app.getHttpServer())
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ fullName: "Busy Driver", phone: `+91300${Math.floor(Math.random() * 1_000_000)}` })
      .expect(201);
    const driverId = driverRes.body.id;

    const shift = await prisma.shift.create({
      data: { corporateOrgId: corporate.organisation.id, name: "Morning", startTime: "09:00", endTime: "18:00" },
    });
    const startAt = new Date(Date.now() + 3600_000);
    const tripA = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-TEST-${Math.floor(Math.random() * 1_000_000)}`,
        corporateOrgId: corporate.organisation.id,
        vendorOrgId: vendor.organisation.id,
        shiftId: shift.id,
        scheduledStartAt: startAt,
        status: "CREATED",
      },
    });
    const tripB = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-TEST-${Math.floor(Math.random() * 1_000_000)}`,
        corporateOrgId: corporate.organisation.id,
        vendorOrgId: vendor.organisation.id,
        shiftId: shift.id,
        scheduledStartAt: new Date(startAt.getTime() + 30 * 60_000),
        status: "CREATED",
      },
    });

    const assignA = await request(app.getHttpServer())
      .post(`/v1/trips/${tripA.id}/assignments`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ driverId, source: "AUTO" });
    expect(assignA.status).toBe(201);

    const assignB = await request(app.getHttpServer())
      .post(`/v1/trips/${tripB.id}/assignments`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ driverId, source: "AUTO" });
    expect(assignB.status).toBe(409);
  });
});
