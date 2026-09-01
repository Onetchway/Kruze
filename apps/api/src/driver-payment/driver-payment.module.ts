import { Module } from "@nestjs/common";
import { DriverPaymentService } from "./driver-payment.service";
import { DriverPaymentController } from "./driver-payment.controller";

@Module({
  providers: [DriverPaymentService],
  controllers: [DriverPaymentController],
})
export class DriverPaymentModule {}
