import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { ContractService } from "./contract.service";
import { CreateContractDto } from "./dto/create-contract.dto";
import { CreateRateCardDto } from "./dto/create-rate-card.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("contracts")
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(private readonly contracts: ContractService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN)
  @Audited({ action: "CONTRACT_CREATED", resourceType: "Contract" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContractDto) {
    return this.contracts.create(user, dto);
  }

  @Post(":id/activate")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN)
  @Audited({ action: "CONTRACT_ACTIVATED", resourceType: "Contract" })
  activate(@Param("id") id: string) {
    return this.contracts.activate(id);
  }

  @Post(":id/rate-cards")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.VENDOR_ADMIN)
  @Audited({ action: "RATE_CARD_ADDED", resourceType: "RateCard" })
  addRateCard(@Param("id") id: string, @Body() dto: CreateRateCardDto) {
    return this.contracts.addRateCard(id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.contracts.listForOrganisation(user.organisationId);
  }
}
