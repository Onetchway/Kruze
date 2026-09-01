import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Consumer, Kafka } from "kafkajs";
import { PrismaService } from "../common/prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { ALL_TOPICS } from "./topics";

interface KafkaEventEnvelope {
  event: string;
  orgIds: (string | null | undefined)[];
  payload: Record<string, unknown>;
}

/**
 * The other half of the real Kafka event backbone: subscribes to every
 * domain-event topic and, for each message, (a) forwards it to connected
 * WebSocket clients via RealtimeGateway — the same live-push behaviour
 * the frontends/mobile apps already relied on — and (b) persists it to
 * EventLogEntry, a durable, replayable record written only from this
 * consumer, never from the synchronous request path that published the
 * event. That's the concrete proof this is genuine decoupled pub/sub and
 * not just a topic nobody reads: kill this consumer, republish is still
 * on the log, and event_log_entries simply stops growing until it's back.
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {
    const brokers = (this.config.get<string>("KAFKA_BROKERS") ?? "localhost:9092").split(",");
    this.kafka = new Kafka({ clientId: "kruze-api-consumer", brokers, retry: { retries: 2 } });
    this.consumer = this.kafka.consumer({ groupId: "kruze-api-realtime-fanout" });
  }

  async onModuleInit() {
    // See KafkaProducerService.onModuleInit for why this is skipped under
    // Jest and why the connect isn't awaited.
    if (process.env.JEST_WORKER_ID !== undefined) {
      return;
    }
    this.connect().catch((err: Error) => {
      this.logger.warn(`Kafka consumer could not start — no async fan-out until it recovers: ${err.message}`);
    });
  }

  private async connect() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: ALL_TOPICS, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        const envelope = JSON.parse(message.value.toString()) as KafkaEventEnvelope;
        const uniqueOrgIds = [...new Set(envelope.orgIds.filter((id): id is string => Boolean(id)))];
        for (const orgId of uniqueOrgIds) {
          this.realtime.emitToOrg(orgId, envelope.event, envelope.payload);
        }
        await this.prisma.eventLogEntry.create({
          data: {
            topic,
            eventKey: message.key?.toString() ?? "",
            event: envelope.event,
            payload: envelope.payload as never,
          },
        });
      },
    });
    this.logger.log(`Kafka consumer subscribed to [${ALL_TOPICS.join(", ")}]`);
  }

  async onModuleDestroy() {
    await this.consumer.disconnect().catch(() => undefined);
  }
}
