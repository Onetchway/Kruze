import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OrganisationRole } from "@kruze/domain";
import { createTestApp, seedOrganisationWithUser } from "./support/test-app";
import { PrismaService } from "../src/common/prisma/prisma.service";

/**
 * Exercises the real Kafka event backbone end to end against a live
 * broker — NOT part of the default `test:e2e` run (see
 * jest-e2e-kafka.json / package.json's `test:e2e:kafka`), since every
 * other suite deliberately skips Kafka connection under Jest
 * (KafkaProducerService/KafkaConsumerService check JEST_WORKER_ID) so CI
 * doesn't need a broker just to test business logic.
 *
 * This suite needs one: `KAFKA_BROKERS` (default localhost:9092) must
 * point at a real, reachable broker before running
 * `pnpm test:e2e:kafka`. It temporarily deletes JEST_WORKER_ID so the
 * services behave exactly as they do outside Jest, then proves the full
 * path: HTTP request -> TripService publishes to Kafka -> real broker ->
 * KafkaConsumerService (a genuinely separate async consumer, not the
 * request handler) -> EventLogEntry persisted. Polls rather than
 * sleeping a fixed amount, since consumption is asynchronous.
 */
describe("Kafka event backbone: HTTP request -> real broker -> async consumer -> EventLogEntry", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let savedWorkerId: string | undefined;

  beforeAll(async () => {
    savedWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
    // Give the producer/consumer a moment to finish their (unawaited,
    // fire-and-forget) connect + consumer-group join before the first request.
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }, 20_000);

  afterAll(async () => {
    await app.close();
    process.env.JEST_WORKER_ID = savedWorkerId;
  });

  async function pollForEventLog(eventKey: string, event: string, timeoutMs = 10_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const row = await prisma.eventLogEntry.findFirst({ where: { eventKey, event }, orderBy: { consumedAt: "desc" } });
      if (row) return row;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`No EventLogEntry for eventKey=${eventKey} event=${event} within ${timeoutMs}ms — is Kafka running at KAFKA_BROKERS?`);
  }

  it("a trip transition genuinely flows through Kafka into EventLogEntry", async () => {
    const corporate = await seedOrganisationWithUser(prisma, { role: OrganisationRole.CORPORATE, membershipRole: "CORPORATE_TRANSPORT_ADMIN" });
    const loginRes = await request(app.getHttpServer()).post("/v1/auth/login").send({ email: corporate.email, password: corporate.password });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.accessToken;

    const shift = await prisma.shift.create({
      data: { corporateOrgId: corporate.organisation.id, name: "Kafka e2e shift", startTime: "09:00", endTime: "10:00" },
    });
    const trip = await prisma.trip.create({
      data: {
        globalTripId: `KZ-TRP-KAFKA-E2E-${Date.now()}`,
        corporateOrgId: corporate.organisation.id,
        shiftId: shift.id,
        scheduledStartAt: new Date(),
        status: "CREATED",
      },
    });

    const transitionRes = await request(app.getHttpServer())
      .post(`/v1/trips/${trip.id}/transition`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "SCHEDULED" });
    expect(transitionRes.status).toBe(201);

    const eventLogRow = await pollForEventLog(trip.id, "trip.status");
    expect(eventLogRow.topic).toBe("kruze.trip.events");
    expect((eventLogRow.payload as { status: string }).status).toBe("SCHEDULED");
  }, 20_000);
});
