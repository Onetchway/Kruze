# Kafka event backbone

A real Kafka event backbone — not a WebSocket-only substitute. Domain
services (`TripService`, `IncidentService`, `TrackingService`) publish
to Kafka topics (`kruze.trip.events`, `kruze.incident.events`,
`kruze.tracking.events`) via `KafkaProducerService`.
`KafkaConsumerService` subscribes to all three as a genuinely separate
async consumer group (`kruze-api-realtime-fanout`) and, for every
message, (a) forwards it to connected WebSocket clients via
`RealtimeGateway` — the same live-push behaviour the web/mobile apps
already rely on — and (b) persists it to `EventLogEntry`, a durable
table written *only* by the consumer, never by the request path that
published the event. That's the proof this is genuine decoupled
pub/sub rather than a topic nobody reads: stop the consumer and the
producing requests keep succeeding, `event_log_entries` just stops
growing until it's back.

## Failure mode: fire-and-forget, never blocking

Both services connect in the background (`onModuleInit` does not
`await` the connect call) and `publish()` is a no-op until the
producer reports itself connected. A broker outage — at boot or at any
point after — never fails the underlying business request (a trip
transition, an incident report, a GPS ping): it only means that
request's live WebSocket push and durable event-log row are delayed
until the broker is reachable again. Verified directly: booted the API
with no broker running at all, then successfully transitioned a trip
over HTTP (`201`), with `KafkaProducerService`/`KafkaConsumerService`
logging a warning instead of throwing.

## Skipped under Jest

The default `test:e2e`/`test` runs never touch Kafka —
`KafkaProducerService`/`KafkaConsumerService.onModuleInit` no-op when
`JEST_WORKER_ID` is set, the same pattern `ThrottlerModule` already
uses. CI shouldn't need a running broker just to test business logic,
and kafkajs's open sockets would otherwise leak across Jest workers.

## Running Kafka locally

No Docker required — a single-node KRaft broker (no ZooKeeper) is
enough for local dev:

```bash
# Download once (~135MB): https://archive.apache.org/dist/kafka/4.0.0/kafka_2.13-4.0.0.tgz
tar xzf kafka_2.13-4.0.0.tgz
cd kafka_2.13-4.0.0

CLUSTER_ID=$(bin/kafka-storage.sh random-uuid)
bin/kafka-storage.sh format --standalone -t "$CLUSTER_ID" -c config/server.properties
bin/kafka-server-start.sh config/server.properties
```

The default `config/server.properties` already listens on
`localhost:9092` and has `auto.create.topics.enable=true`, so no
manual topic setup is needed — matches this module's
`KAFKA_BROKERS` default.

## Verifying the real end-to-end flow

`test/kafka-eventbus.e2e-spec.ts` is a dedicated suite (run via
`pnpm test:e2e:kafka`, **not** part of the default `test:e2e`) that
needs a real broker at `KAFKA_BROKERS` (default `localhost:9092`). It
temporarily unsets `JEST_WORKER_ID` so the services behave exactly as
they do outside Jest, then proves: `POST /trips/:id/transition` →
Kafka → the consumer (a separate async process, not the request
handler) → a row in `EventLogEntry`.

This was also verified manually against a real running broker outside
Jest entirely: an HTTP trip transition produced a message that showed
up in `event_log_entries` (written by the consumer) and was pushed to
a connected `socket.io-client` over the `trip.status` WebSocket event
— the same event name and payload shape the Corporate Web / Control
Room Web / driver-app frontends already listen for, now genuinely
sourced from Kafka instead of a direct in-process call.
