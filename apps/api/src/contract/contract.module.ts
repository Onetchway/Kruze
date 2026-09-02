import { Module } from "@nestjs/common";
import { ContractService } from "./contract.service";
import { ContractController, RateCardController } from "./contract.controller";

@Module({
  providers: [ContractService],
  controllers: [ContractController, RateCardController],
  exports: [ContractService],
})
export class ContractModule {}
