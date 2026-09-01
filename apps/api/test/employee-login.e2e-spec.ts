import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

/**
 * Covers the employee mobile-app login path: self-signup creates a
 * login-capable account immediately, but the account has no session until
 * the corporate approves — at which point it gains an EMPLOYEE
 * membership and can log in, see today's trip, and generate (only) its
 * own pickup/drop OTP.
 */
describe("Employee account: signup -> approval -> login -> own-trip access", () => {
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
    const corporateToken = await login(corporate.email, corporate.password);

    const globalOrgId = (
      await request(app.getHttpServer()).get("/v1/organisations/me").set("Authorization", `Bearer ${corporateToken}`)
    ).body.globalOrgId;

    const email = `mobile-emp-${Date.now()}@example.com`;
    const signupRes = await request(app.getHttpServer()).post("/v1/employees/signup").send({
      globalOrgId,
      fullName: "Mobile Employee",
      phone: `9${Date.now()}`,
      email,
      password: "Password123!",
    });
    expect(signupRes.status).toBe(201);
    const employeeId = signupRes.body.id;

    // Before approval: the account has a login, but no membership means no session.
    const loginBeforeApproval = await request(app.getHttpServer()).post("/v1/auth/login").send({ email, password: "Password123!" });
    expect(loginBeforeApproval.status).toBe(401);

    // Approve.
    const approveRes = await request(app.getHttpServer())
      .post(`/v1/employees/${employeeId}/approve`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({});
    expect(approveRes.status).toBe(201);

    // Now login succeeds, with an EMPLOYEE-role session at the corporate org.
    const employeeToken = await login(email, "Password123!");
    const meRes = await request(app.getHttpServer()).get("/v1/employees/me").set("Authorization", `Bearer ${employeeToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe(employeeId);

    // Set up a trip today, assign this employee to it.
    const shift = await prisma.shift.create({
      data: { corporateOrgId: corporate.organisation.id, name: "Morning", startTime: "09:00", endTime: "10:00" },
    });
    const trip = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-EMP-${Date.now()}`,
        corporateOrgId: corporate.organisation.id,
        vendorOrgId: vendor.organisation.id,
        shiftId: shift.id,
        scheduledStartAt: new Date(),
        status: "CREATED",
        employees: { create: { employeeId, status: "PLANNED" } },
      },
      include: { employees: true },
    });
    const tripEmployeeId = trip.employees[0].id;

    const myTripsRes = await request(app.getHttpServer()).get("/v1/employees/me/trips/today").set("Authorization", `Bearer ${employeeToken}`);
    expect(myTripsRes.status).toBe(200);
    expect(myTripsRes.body.some((te: { id: string }) => te.id === tripEmployeeId)).toBe(true);

    // The employee can generate their own pickup OTP.
    const ownOtpRes = await request(app.getHttpServer())
      .post("/v1/otp-challenges")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ tripEmployeeId, purpose: "PICKUP" });
    expect(ownOtpRes.status).toBe(201);

    // A second employee on the same corporate cannot generate the first employee's OTP.
    const otherEmail = `mobile-emp-2-${Date.now()}@example.com`;
    const otherSignup = await request(app.getHttpServer()).post("/v1/employees/signup").send({
      globalOrgId,
      fullName: "Other Employee",
      phone: `8${Date.now()}`,
      email: otherEmail,
      password: "Password123!",
    });
    await request(app.getHttpServer())
      .post(`/v1/employees/${otherSignup.body.id}/approve`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({});
    const otherToken = await login(otherEmail, "Password123!");

    const crossOtpRes = await request(app.getHttpServer())
      .post("/v1/otp-challenges")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ tripEmployeeId, purpose: "PICKUP" });
    expect(crossOtpRes.status).toBe(403);
  });
});
