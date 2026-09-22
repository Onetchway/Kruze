import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

/**
 * Automation Decision Log (spec §44/§59) — verifies a real plan-generation
 * run writes PlanningDecisionLog rows with genuine candidate/rejected/
 * selected reasoning, and that the platform-admin query endpoint surfaces them.
 */
describe("Automation Decision Log", () => {
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

  it("records a driver/vehicle assignment's decision log with a rejected under-capacity vehicle and a selected winner", async () => {
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const superAdmin = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.CORPORATE,
      membershipRole: "KRUZE_SUPER_ADMIN",
    });
    const vendorToken = await login(vendor.email, vendor.password);
    const corporateToken = await login(corporate.email, corporate.password);
    const adminToken = await login(superAdmin.email, superAdmin.password);

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

    // One too-small vehicle (must be rejected: capacity insufficient) and one that fits.
    await request(app.getHttpServer())
      .post("/v1/vehicles")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ registrationNo: `KA02SM${Math.floor(Math.random() * 100000)}`, capacity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post("/v1/vehicles")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ registrationNo: `KA02BG${Math.floor(Math.random() * 100000)}`, capacity: 6 })
      .expect(201);
    await request(app.getHttpServer())
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ fullName: "Decision Log Driver", phone: `+91600${Math.floor(Math.random() * 1_000_000)}` })
      .expect(201);

    const shiftRes = await request(app.getHttpServer())
      .post("/v1/shifts")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ name: "Morning", startTime: "09:00", endTime: "18:00" })
      .expect(201);
    const shiftId = shiftRes.body.id;

    // Two employees in demand so the too-small (capacity 1) vehicle is genuinely insufficient.
    const planDate = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 2; i++) {
      const employeeRes = await request(app.getHttpServer())
        .post("/v1/employees")
        .set("Authorization", `Bearer ${corporateToken}`)
        .send({ employeeCode: `DL${Math.floor(Math.random() * 1_000_000)}`, fullName: `Decision Log Employee ${i}`, phone: `+91800${Math.floor(Math.random() * 1_000_000)}` })
        .expect(201);
      await request(app.getHttpServer())
        .post("/v1/roster-entries")
        .set("Authorization", `Bearer ${corporateToken}`)
        .send({ employeeId: employeeRes.body.id, shiftId, date: planDate, status: "OPTED_IN" })
        .expect(201);
    }

    const planRes = await request(app.getHttpServer())
      .post("/v1/plans/generate")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ shiftId, planDate })
      .expect(201);
    expect(planRes.body.status).toBe("READY");

    const trip = await prisma.trip.findFirstOrThrow({ where: { planId: planRes.body.id } });

    const log = await prisma.planningDecisionLog.findUnique({ where: { tripId: trip.id } });
    expect(log).not.toBeNull();
    expect(log!.corporateOrgId).toBe(corporate.organisation.id);
    expect(log!.algorithmVersion).toBeTruthy();

    const rejected = log!.rejectedResources as Array<{ type: string; reason: string }>;
    expect(rejected.some((r) => r.type === "VEHICLE" && /[Cc]apacity/.test(r.reason))).toBe(true);

    const selected = log!.selectedResource as { driver: { id: string }; vehicle: { id: string } };
    expect(selected.driver.id).toBeTruthy();
    expect(selected.vehicle.id).toBeTruthy();

    // Platform-admin query endpoint surfaces the same row.
    const listRes = await request(app.getHttpServer())
      .get(`/v1/platform/decision-log?tripId=${trip.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listRes.body.entries.length).toBe(1);
    expect(listRes.body.entries[0].tripId).toBe(trip.id);

    const detailRes = await request(app.getHttpServer())
      .get(`/v1/platform/decision-log/${log!.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(detailRes.body.trip.id).toBe(trip.id);
  });
});
