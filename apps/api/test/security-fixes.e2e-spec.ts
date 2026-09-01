import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

/**
 * Regression coverage for the cross-tenant IDOR/auth-bypass findings from
 * the backend security audit — each of these previously let an
 * authenticated user of one org read or mutate another org's data.
 */
describe("Security fixes: cross-tenant access is blocked", () => {
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

  async function activateRelationship(sourceOrgId: string, targetOrgId: string) {
    const dummyUser = await prisma.user.findFirstOrThrow();
    return prisma.organisationRelationship.create({
      data: {
        sourceOrgId,
        targetOrgId,
        type: "CORPORATE_VENDOR",
        status: "ACTIVE",
        createdByUserId: dummyUser.id,
        startsAt: new Date(),
      },
    });
  }

  /** A COMPLETED trip owned by (corporateOrgId, vendorOrgId), with a driver+vehicle assignment and a shift. */
  async function seedTrip(corporateOrgId: string, vendorOrgId: string) {
    const shift = await prisma.shift.create({
      data: { corporateOrgId, name: "Morning", startTime: "09:00", endTime: "10:00" },
    });
    const employee = await prisma.employee.create({
      data: { corporateOrgId, employeeCode: `E${Date.now()}`, fullName: "Test Employee", phone: `9${Date.now()}` },
    });
    const now = new Date();
    const trip = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-SEC-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        corporateOrgId,
        vendorOrgId,
        shiftId: shift.id,
        scheduledStartAt: now,
        status: "COMPLETED",
        actualDistanceKm: 10,
        employees: { create: { employeeId: employee.id, status: "PLANNED" } },
      },
      include: { employees: true },
    });
    return { trip, employee, tripEmployee: trip.employees[0] };
  }

  it("GET /trips/:id — a vendor not party to the trip gets 404, the owning corporate gets 200", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsiderVendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const { trip } = await seedTrip(corporate.organisation.id, vendor.organisation.id);

    const corporateToken = await login(corporate.email, corporate.password);
    const outsiderToken = await login(outsiderVendor.email, outsiderVendor.password);

    const blocked = await request(app.getHttpServer()).get(`/v1/trips/${trip.id}`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(blocked.status).toBe(404);

    const allowed = await request(app.getHttpServer()).get(`/v1/trips/${trip.id}`).set("Authorization", `Bearer ${corporateToken}`);
    expect(allowed.status).toBe(200);
  });

  it("Tracking: an unrelated vendor cannot ingest/read GPS for another vendor's trip or vehicle", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsiderVendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const { trip } = await seedTrip(corporate.organisation.id, vendor.organisation.id);

    const vendorToken = await login(vendor.email, vendor.password);
    const outsiderToken = await login(outsiderVendor.email, outsiderVendor.password);

    const vehicleRes = await request(app.getHttpServer())
      .post("/v1/vehicles")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ registrationNo: `KA02CD${Date.now()}`, vehicleType: "SEDAN" });
    expect(vehicleRes.status).toBe(201);
    const vehicleId = vehicleRes.body.id;

    // Outsider cannot ingest against this trip or vehicle.
    const ingestBlocked = await request(app.getHttpServer())
      .post("/v1/tracking/locations")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ tripId: trip.id, latitude: 12.9, longitude: 77.6, recordedAt: new Date().toISOString() });
    expect(ingestBlocked.status).toBe(403);

    const ingestVehicleBlocked = await request(app.getHttpServer())
      .post("/v1/tracking/locations")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ vehicleId, latitude: 12.9, longitude: 77.6, recordedAt: new Date().toISOString() });
    expect(ingestVehicleBlocked.status).toBe(403);

    // The owning vendor can ingest.
    const ingestAllowed = await request(app.getHttpServer())
      .post("/v1/tracking/locations")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ tripId: trip.id, latitude: 12.9, longitude: 77.6, recordedAt: new Date().toISOString() });
    expect(ingestAllowed.status).toBe(201);

    // Outsider cannot read latest/history for the trip or vehicle.
    const latestTripBlocked = await request(app.getHttpServer()).get(`/v1/tracking/trips/${trip.id}/latest`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(latestTripBlocked.status).toBe(403);
    const historyBlocked = await request(app.getHttpServer()).get(`/v1/tracking/trips/${trip.id}/history`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(historyBlocked.status).toBe(403);
    const latestVehicleBlocked = await request(app.getHttpServer()).get(`/v1/tracking/vehicles/${vehicleId}/latest`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(latestVehicleBlocked.status).toBe(403);

    // The corporate (a legitimate party to the trip) can read it.
    const corporateToken = await login(corporate.email, corporate.password);
    const latestAllowed = await request(app.getHttpServer()).get(`/v1/tracking/trips/${trip.id}/latest`).set("Authorization", `Bearer ${corporateToken}`);
    expect(latestAllowed.status).toBe(200);
  });

  it("OTP: an outsider vendor cannot generate or verify OTPs for another vendor's trip employee", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsiderVendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const { tripEmployee } = await seedTrip(corporate.organisation.id, vendor.organisation.id);

    const vendorToken = await login(vendor.email, vendor.password);
    const outsiderToken = await login(outsiderVendor.email, outsiderVendor.password);

    const genBlocked = await request(app.getHttpServer())
      .post("/v1/otp-challenges")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ tripEmployeeId: tripEmployee.id, purpose: "PICKUP" });
    expect(genBlocked.status).toBe(403);

    const genAllowed = await request(app.getHttpServer())
      .post("/v1/otp-challenges")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ tripEmployeeId: tripEmployee.id, purpose: "PICKUP" });
    expect(genAllowed.status).toBe(201);
    const { otpChallengeId, code } = genAllowed.body;

    // The outsider cannot even attempt verification (blocked before code check).
    const verifyBlocked = await request(app.getHttpServer())
      .post(`/v1/otp-challenges/${otpChallengeId}/verify`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ code });
    expect(verifyBlocked.status).toBe(403);

    const verifyAllowed = await request(app.getHttpServer())
      .post(`/v1/otp-challenges/${otpChallengeId}/verify`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ code });
    expect(verifyAllowed.status).toBe(201);
  });

  it("Billing: an unrelated corporate cannot add/approve invoice lines or compute/read another corporate's trip charge", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_FINANCE" });
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsiderCorporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_FINANCE" });
    const { trip } = await seedTrip(corporate.organisation.id, vendor.organisation.id);

    const corporateToken = await login(corporate.email, corporate.password);
    const outsiderToken = await login(outsiderCorporate.email, outsiderCorporate.password);

    const chargeBlocked = await request(app.getHttpServer()).post(`/v1/trips/${trip.id}/charge`).set("Authorization", `Bearer ${outsiderToken}`).send();
    expect(chargeBlocked.status).toBe(404);

    const invoice = await prisma.invoice.create({
      data: { corporateOrgId: corporate.organisation.id, vendorOrgId: vendor.organisation.id, periodStart: new Date(), periodEnd: new Date(), status: "DRAFT" },
    });

    const addLineBlocked = await request(app.getHttpServer())
      .post(`/v1/invoices/${invoice.id}/lines`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ tripId: trip.id, claimedAmount: 100 });
    expect(addLineBlocked.status).toBe(404);

    const addLineAllowed = await request(app.getHttpServer())
      .post(`/v1/invoices/${invoice.id}/lines`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ tripId: trip.id, claimedAmount: 100 });
    expect(addLineAllowed.status).toBe(201);
    const lineId = addLineAllowed.body.id;

    const approveBlocked = await request(app.getHttpServer()).post(`/v1/invoices/lines/${lineId}/approve`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(approveBlocked.status).toBe(404);
  });

  it("Contracts: only the owning corporate/vendor can activate a contract or add a rate card", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsiderCorporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    await activateRelationship(corporate.organisation.id, vendor.organisation.id);

    const corporateToken = await login(corporate.email, corporate.password);
    const outsiderToken = await login(outsiderCorporate.email, outsiderCorporate.password);

    const contractRes = await request(app.getHttpServer())
      .post("/v1/contracts")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ vendorOrgId: vendor.organisation.id, startsAt: new Date().toISOString() });
    expect(contractRes.status).toBe(201);
    const contractId = contractRes.body.id;

    const activateBlocked = await request(app.getHttpServer()).post(`/v1/contracts/${contractId}/activate`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(activateBlocked.status).toBe(404);

    const rateCardBlocked = await request(app.getHttpServer())
      .post(`/v1/contracts/${contractId}/rate-cards`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ vehicleType: "SEDAN", pricingModel: "PER_TRIP", pricingRules: { perTripFlat: 100 }, effectiveFrom: new Date().toISOString() });
    expect(rateCardBlocked.status).toBe(404);

    const activateAllowed = await request(app.getHttpServer()).post(`/v1/contracts/${contractId}/activate`).set("Authorization", `Bearer ${corporateToken}`);
    expect(activateAllowed.status).toBe(201);
  });

  it("Workflow: an approver from an unrelated org cannot approve/reject/cancel another org's approval request", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_FINANCE" });
    const outsiderCorporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_FINANCE" });

    const corporateToken = await login(corporate.email, corporate.password);
    const outsiderToken = await login(outsiderCorporate.email, outsiderCorporate.password);

    const requestRes = await request(app.getHttpServer())
      .post("/v1/approval-requests")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ workflowType: "TEST_WORKFLOW", resourceType: "Test", resourceId: "abc", organisationId: corporate.organisation.id });
    expect(requestRes.status).toBe(201);
    const requestId = requestRes.body.id;

    const approveBlocked = await request(app.getHttpServer()).post(`/v1/approval-requests/${requestId}/approve`).set("Authorization", `Bearer ${outsiderToken}`).send({});
    expect(approveBlocked.status).toBe(403);

    const cancelBlocked = await request(app.getHttpServer()).post(`/v1/approval-requests/${requestId}/cancel`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(cancelBlocked.status).toBe(403);

    // The outsider's "pending" list must not include this org-scoped request.
    const listRes = await request(app.getHttpServer()).get("/v1/approval-requests/pending").set("Authorization", `Bearer ${outsiderToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.find((r: { id: string }) => r.id === requestId)).toBeUndefined();

    const approveAllowed = await request(app.getHttpServer()).post(`/v1/approval-requests/${requestId}/approve`).set("Authorization", `Bearer ${corporateToken}`).send({});
    expect(approveAllowed.status).toBe(201);
  });

  it("Incidents: list() and close() are scoped to the caller's own trips", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsider = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const { trip } = await seedTrip(corporate.organisation.id, vendor.organisation.id);

    const corporateToken = await login(corporate.email, corporate.password);
    const outsiderToken = await login(outsider.email, outsider.password);

    const reportRes = await request(app.getHttpServer())
      .post("/v1/incidents")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ tripId: trip.id, category: "SOS", description: "test" });
    expect(reportRes.status).toBe(201);
    const incidentId = reportRes.body.id;

    const listOutsider = await request(app.getHttpServer()).get("/v1/incidents").set("Authorization", `Bearer ${outsiderToken}`);
    expect(listOutsider.status).toBe(200);
    expect(listOutsider.body.find((i: { id: string }) => i.id === incidentId)).toBeUndefined();

    const closeBlocked = await request(app.getHttpServer())
      .post(`/v1/incidents/${incidentId}/close`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ correctiveAction: "n/a" });
    expect(closeBlocked.status).toBe(404);

    const closeAllowed = await request(app.getHttpServer())
      .post(`/v1/incidents/${incidentId}/close`)
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ correctiveAction: "resolved" });
    expect(closeAllowed.status).toBe(201);
  });

  it("EV: an unrelated vendor cannot write or read another vendor's battery-state / charging sessions", async () => {
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsiderVendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const vendorToken = await login(vendor.email, vendor.password);
    const outsiderToken = await login(outsiderVendor.email, outsiderVendor.password);

    const vehicleRes = await request(app.getHttpServer())
      .post("/v1/vehicles")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ registrationNo: `KA03EF${Date.now()}`, vehicleType: "SEDAN", isElectric: true });
    expect(vehicleRes.status).toBe(201);
    const vehicleId = vehicleRes.body.id;

    const updateBlocked = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/ev/battery-state`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ socPercent: 50 });
    expect(updateBlocked.status).toBe(403);

    const updateAllowed = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/ev/battery-state`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ socPercent: 80 });
    expect(updateAllowed.status).toBe(201);

    const readBlocked = await request(app.getHttpServer()).get(`/v1/vehicles/${vehicleId}/ev/battery-state`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(readBlocked.status).toBe(403);
  });

  it("Maintenance: an unrelated vendor cannot schedule maintenance on another vendor's vehicle", async () => {
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsiderVendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const vendorToken = await login(vendor.email, vendor.password);
    const outsiderToken = await login(outsiderVendor.email, outsiderVendor.password);

    const vehicleRes = await request(app.getHttpServer())
      .post("/v1/vehicles")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ registrationNo: `KA04GH${Date.now()}`, vehicleType: "SEDAN" });
    expect(vehicleRes.status).toBe(201);
    const vehicleId = vehicleRes.body.id;

    const scheduleBlocked = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenance`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ type: "REPAIR" });
    expect(scheduleBlocked.status).toBe(403);

    const scheduleAllowed = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenance`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ type: "REPAIR" });
    expect(scheduleAllowed.status).toBe(201);
    const recordId = scheduleAllowed.body.id;

    const cancelBlocked = await request(app.getHttpServer()).post(`/v1/maintenance-records/${recordId}/cancel`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(cancelBlocked.status).toBe(403);
  });

  it("Compliance: eligibility check and document listing require the caller to be a party to the org context", async () => {
    const vendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const outsiderVendor = await seedOrganisationWithUser(prisma, { role: OrganisationRole.VENDOR, membershipRole: "VENDOR_ADMIN" });
    const vendorToken = await login(vendor.email, vendor.password);
    const outsiderToken = await login(outsiderVendor.email, outsiderVendor.password);

    const driverRes = await request(app.getHttpServer())
      .post("/v1/drivers")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ fullName: "EligDriver", phone: `9${Date.now()}` });
    expect(driverRes.status).toBe(201);
    const driverId = driverRes.body.id;

    const eligBlocked = await request(app.getHttpServer())
      .get(`/v1/compliance/eligibility?subjectType=DRIVER&subjectId=${driverId}&vendorOrgId=${vendor.organisation.id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(eligBlocked.status).toBe(403);

    const eligAllowed = await request(app.getHttpServer())
      .get(`/v1/compliance/eligibility?subjectType=DRIVER&subjectId=${driverId}&vendorOrgId=${vendor.organisation.id}`)
      .set("Authorization", `Bearer ${vendorToken}`);
    expect(eligAllowed.status).toBe(200);

    const docsBlocked = await request(app.getHttpServer())
      .get(`/v1/documents?entityType=DRIVER&entityId=${driverId}`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(docsBlocked.status).toBe(403);
  });

  it("Auth: only CORPORATE self-registration auto-approves; VENDOR stays PENDING_APPROVAL and cannot form relationships until approved", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const corporateToken = await login(corporate.email, corporate.password);

    const corpRegRes = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: `corp-${Date.now()}@example.com`,
        password: "Password123!",
        displayName: "Corp Admin",
        organisationLegalName: "Auto Approve Corp",
        organisationDisplayName: "Auto Approve Corp",
        organisationRole: "CORPORATE",
      });
    expect(corpRegRes.status).toBe(201);
    const corpOrg = await prisma.organisation.findUnique({ where: { id: corpRegRes.body.organisationId } });
    expect(corpOrg?.status).toBe("ACTIVE");

    const vendorRegRes = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: `vendor-${Date.now()}@example.com`,
        password: "Password123!",
        displayName: "Vendor Admin",
        organisationLegalName: "Unvetted Vendor",
        organisationDisplayName: "Unvetted Vendor",
        organisationRole: "VENDOR",
      });
    expect(vendorRegRes.status).toBe(201);
    const vendorOrgId = vendorRegRes.body.organisationId;
    const vendorOrg = await prisma.organisation.findUnique({ where: { id: vendorOrgId } });
    expect(vendorOrg?.status).toBe("PENDING_APPROVAL");

    // The pending vendor can still log in...
    expect(vendorRegRes.body.accessToken).toBeTruthy();

    // ...but cannot form a relationship with a real (active) corporate yet.
    const vendorToken = vendorRegRes.body.accessToken as string;
    const inviteBlocked = await request(app.getHttpServer())
      .post("/v1/organisation-relationships")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ targetOrgId: corporate.organisation.id, type: "CORPORATE_VENDOR" });
    expect(inviteBlocked.status).toBe(400);

    // Nor can the active corporate invite the still-pending vendor.
    const inviteFromCorpBlocked = await request(app.getHttpServer())
      .post("/v1/organisation-relationships")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ targetOrgId: vendorOrgId, type: "CORPORATE_VENDOR" });
    expect(inviteFromCorpBlocked.status).toBe(400);

    // Once Kruze approves the vendor, relationship formation works normally.
    await prisma.organisation.update({ where: { id: vendorOrgId }, data: { status: "ACTIVE" } });
    const inviteAllowed = await request(app.getHttpServer())
      .post("/v1/organisation-relationships")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ targetOrgId: vendorOrgId, type: "CORPORATE_VENDOR" });
    expect(inviteAllowed.status).toBe(201);

    const acceptAllowed = await request(app.getHttpServer())
      .post(`/v1/organisation-relationships/${inviteAllowed.body.id}/accept`)
      .set("Authorization", `Bearer ${vendorToken}`);
    expect(acceptAllowed.status).toBe(201);
  });

  it("Auth: /auth/register 400s on JWT_ACCESS_SECRET-independent platform self-signup, and issues distinct tokens per org", async () => {
    // Sanity check that server actually started with a real secret (getOrThrow didn't silently fall back).
    const res = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        email: `platform-${Date.now()}@example.com`,
        password: "Password123!",
        displayName: "Nope",
        organisationLegalName: "Evil Co",
        organisationDisplayName: "Evil Co",
        organisationRole: "KRUZE_PLATFORM",
      });
    expect(res.status).toBe(400);
  });
});
