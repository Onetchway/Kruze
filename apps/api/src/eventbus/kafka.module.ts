import { Global, Module } from "@nestjs/common";
import { KafkaProducerService } from "./kafka-producer.service";
import { KafkaConsumerService } from "./kafka-consumer.service";

/**
 * Global so any module can inject KafkaProducerService without an
 * explicit import — same pattern as RealtimeModule and PrismaModule.
 * KafkaConsumerService has no exported methods; it's listed as a
 * provider purely so Nest instantiates it (and runs its OnModuleInit)
 * once at bootstrap.
 */
@Global()
@Module({
  providers: [KafkaProducerService, KafkaConsumerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
