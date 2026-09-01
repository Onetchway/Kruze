import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Tenant isolation (critical test scenarios)", () => {
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

  it("Vendor A cannot access Vendor B's driver, but Vendor B can access its own", async () => {
    const vendorA = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.VENDOR,
      membershipRole: "VENDOR_ADMIN",
    });
    const vendorB = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.VENDOR,
      membershipRole: "VENDOR_ADMIN",
    });

    const tokenA = await login(vendorA.email, vendorA.password);
    const tokenB = await login(vendorB.email, vendorB.password);

    const createRes = await request(app.getHttpServer())
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ fullName: "Rahul Driver", phone: `+91900000${Math.floor(Math.random() * 10000)}` });
    expect(createRes.status).toBe(201);
    const driverId = createRes.body.id;

    const blockedRes = await request(app.getHttpServer())
      .get(`/v1/drivers/${driverId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(blockedRes.status).toBe(403);

    const allowedRes = await request(app.getHttpServer())
      .get(`/v1/drivers/${driverId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.id).toBe(driverId);
  });

  it("Corporate cannot access a vendor's vehicle without an explicit eligibility record, and can once granted", async () => {
    const vendor = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.VENDOR,
      membershipRole: "VENDOR_ADMIN",
    });
    const corporate = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.CORPORATE,
      membershipRole: "CORPORATE_TRANSPORT_ADMIN",
    });

    const vendorToken = await login(vendor.email, vendor.password);
    const corporateToken = await login(corporate.email, corporate.password);

    const createRes = await request(app.getHttpServer())
      .post("/v1/vehicles")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ registrationNo: `DL01AB${Math.floor(Math.random() * 10000)}`, capacity: 12 });
    expect(createRes.status).toBe(201);
    const vehicleId = createRes.body.id;

    const blockedRes = await request(app.getHttpServer())
      .get(`/v1/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${corporateToken}`);
    expect(blockedRes.status).toBe(403);

    await prisma.corporateResourceEligibility.create({
      data: {
        corporateOrgId: corporate.organisation.id,
        vendorOrgId: vendor.organisation.id,
        resourceType: "VEHICLE",
        resourceId: vehicleId,
        status: "ACTIVE",
        startsAt: new Date(),
      },
    });

    const allowedRes = await request(app.getHttpServer())
      .get(`/v1/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${corporateToken}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.id).toBe(vehicleId);
  });

  it("Organisation relationship must be accepted by the invited party before it authorizes cross-org access", async () => {
    const operator = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.FLEET_OPERATOR,
      membershipRole: "FLEET_OPERATOR_ADMIN",
    });
    const corporate = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.CORPORATE,
      membershipRole: "CORPORATE_TRANSPORT_ADMIN",
    });

    const operatorToken = await login(operator.email, operator.password);
    const corporateToken = await login(corporate.email, corporate.password);

    const inviteRes = await request(app.getHttpServer())
      .post("/v1/organisation-relationships")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ targetOrgId: corporate.organisation.id, type: "OPERATOR_MANAGES_CORPORATE" });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.status).toBe("INVITED");

    // The inviting org cannot self-accept.
    const selfAcceptRes = await request(app.getHttpServer())
      .post(`/v1/organisation-relationships/${inviteRes.body.id}/accept`)
      .set("Authorization", `Bearer ${operatorToken}`);
    expect(selfAcceptRes.status).toBe(403);

    const acceptRes = await request(app.getHttpServer())
      .post(`/v1/organisation-relationships/${inviteRes.body.id}/accept`)
      .set("Authorization", `Bearer ${corporateToken}`);
    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.status).toBe("ACTIVE");
  });

  it("A driver double-booked across two vendors keeps distinct relationship rows under one global identity", async () => {
    const vendorA = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.VENDOR,
      membershipRole: "VENDOR_ADMIN",
    });
    const vendorB = await seedOrganisationWithUser(prisma, {
      role: OrganisationRole.VENDOR,
      membershipRole: "VENDOR_ADMIN",
    });

    const driver = await prisma.driver.create({
      data: {
        globalDriverId: `KZ-DRV-TEST-${Math.floor(Math.random() * 100000)}`,
        fullName: "Shared Driver",
        phone: `+91800000${Math.floor(Math.random() * 10000)}`,
        vendorRelationships: {
          create: [
            { vendorOrgId: vendorA.organisation.id, status: "ACTIVE", startsAt: new Date() },
            { vendorOrgId: vendorB.organisation.id, status: "ACTIVE", startsAt: new Date() },
          ],
        },
      },
      include: { vendorRelationships: true },
    });

    expect(driver.vendorRelationships).toHaveLength(2);

    const tokenA = await login(vendorA.email, vendorA.password);
    const tokenB = await login(vendorB.email, vendorB.password);

    const listA = await request(app.getHttpServer())
      .get("/v1/drivers")
      .set("Authorization", `Bearer ${tokenA}`);
    const listB = await request(app.getHttpServer())
      .get("/v1/drivers")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(listA.body.map((d: { id: string }) => d.id)).toContain(driver.id);
    expect(listB.body.map((d: { id: string }) => d.id)).toContain(driver.id);
    // Each vendor's view only carries its own relationship context.
    expect(listA.body.find((d: { id: string }) => d.id === driver.id).vendorRelationships).toHaveLength(1);
    expect(
      listA.body.find((d: { id: string }) => d.id === driver.id).vendorRelationships[0].vendorOrgId,
    ).toBe(vendorA.organisation.id);
  });
});
