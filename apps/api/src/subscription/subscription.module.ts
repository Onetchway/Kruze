import { Global, Module } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionPlanController, SubscriptionController } from "./subscription.controller";

@Global()
@Module({
  providers: [SubscriptionService],
  controllers: [SubscriptionPlanController, SubscriptionController],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
