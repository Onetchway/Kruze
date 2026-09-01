import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Kafka, Producer } from "kafkajs";

/**
 * Publishes domain events to the real Kafka log (see KafkaConsumerService
 * for the consumer side, and README-eventbus.md for how this replaces the
 * earlier direct-call approach). Publishing is fire-and-forget: a broker
 * outage never fails the underlying business request (a trip transition,
 * an incident report) — it only means that request's live WebSocket push
 * and durable EventLogEntry are delayed until the broker is reachable
 * again, which is the correct failure mode for an async event bus.
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private connected = false;

  constructor(private readonly config: ConfigService) {
    const brokers = (this.config.get<string>("KAFKA_BROKERS") ?? "localhost:9092").split(",");
    this.kafka = new Kafka({ clientId: "kruze-api-producer", brokers, retry: { retries: 2 } });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    // Skipped under Jest: the e2e/unit suites don't depend on a running
    // broker (a CI run shouldn't need Kafka up to test business logic),
    // and kafkajs's open sockets otherwise leak past each spec file into
    // the next Jest worker. See test/kafka-eventbus.e2e-spec.ts for the
    // dedicated suite that actually exercises this against a real broker.
    if (process.env.JEST_WORKER_ID !== undefined) {
      return;
    }
    // Deliberately not awaited: connecting is real network I/O against a
    // real broker, and app bootstrap should never block — let alone fail
    // — on Kafka being reachable yet. publish() no-ops until `connected`
    // flips true.
    this.producer
      .connect()
      .then(() => {
        this.connected = true;
        this.logger.log("Kafka producer connected");
      })
      .catch((err: Error) => {
        this.logger.warn(`Kafka producer could not connect — events will not be published until it recovers: ${err.message}`);
      });
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.producer.disconnect().catch(() => undefined);
    }
  }

  async publish(topic: string, key: string, event: string, orgIds: (string | null | undefined)[], payload: unknown): Promise<void> {
    if (!this.connected) {
      return;
    }
    try {
      await this.producer.send({
        topic,
        messages: [{ key, value: JSON.stringify({ event, orgIds, payload }) }],
      });
    } catch (err) {
      this.logger.warn(`Publish to ${topic} failed: ${(err as Error).message}`);
    }
  }
}
