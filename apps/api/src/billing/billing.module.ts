import { Module } from "@nestjs/common";
import { TripChargeService } from "./trip-charge.service";
import { InvoiceService } from "./invoice.service";
import { TripChargeController, InvoiceController, VendorPayablesController } from "./billing.controller";
import { ContractModule } from "../contract/contract.module";

@Module({
  imports: [ContractModule],
  providers: [TripChargeService, InvoiceService],
  controllers: [TripChargeController, InvoiceController, VendorPayablesController],
  exports: [TripChargeService, InvoiceService],
})
export class BillingModule {}
