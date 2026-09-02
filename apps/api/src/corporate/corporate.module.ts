import { Module } from "@nestjs/common";
import { CorporateService } from "./corporate.service";
import { CorporateController } from "./corporate.controller";
import { CorporateUserService } from "./corporate-user.service";
import { CorporateUserController } from "./corporate-user.controller";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  providers: [CorporateService, CorporateUserService],
  controllers: [CorporateController, CorporateUserController],
})
export class CorporateModule {}
