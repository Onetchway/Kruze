import { Module } from "@nestjs/common";
import { CorporateService } from "./corporate.service";
import { CorporateController } from "./corporate.controller";

@Module({
  providers: [CorporateService],
  controllers: [CorporateController],
})
export class CorporateModule {}
