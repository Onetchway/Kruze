import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { ContractService } from "./contract.service";
import { CreateContractDto } from "./dto/create-contract.dto";
import { CreateRateCardDto } from "./dto/create-rate-card.dto";
import { UpdateRateCardDto } from "./dto/update-rate-card.dto";
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
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_FINANCE)
  @Audited({ action: "CONTRACT_CREATED", resourceType: "Contract" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContractDto) {
    return this.contracts.create(user, dto);
  }

  @Post(":id/activate")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_FINANCE)
  @Audited({ action: "CONTRACT_ACTIVATED", resourceType: "Contract" })
  activate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.contracts.activate(user, id);
  }

  @Post(":id/rate-cards")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.VENDOR_ADMIN)
  @Audited({ action: "RATE_CARD_ADDED", resourceType: "RateCard" })
  addRateCard(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CreateRateCardDto) {
    return this.contracts.addRateCard(user, id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.contracts.listForOrganisation(user.organisationId);
  }
}

/** Rate cards promoted to their own list/detail screen (spec §12), rather than only nested under a contract. */
@Controller("rate-cards")
@UseGuards(JwtAuthGuard)
export class RateCardController {
  constructor(private readonly contracts: ContractService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.contracts.listRateCardsForCorporate(user.organisationId);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_FINANCE, PlatformRole.VENDOR_ADMIN)
  @Audited({ action: "RATE_CARD_UPDATED", resourceType: "RateCard" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateRateCardDto) {
    return this.contracts.updateRateCard(user, id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_FINANCE)
  @Audited({ action: "RATE_CARD_REMOVED", resourceType: "RateCard" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.contracts.removeRateCard(user, id);
  }
}
