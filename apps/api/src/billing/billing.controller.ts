import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { TripChargeService } from "./trip-charge.service";
import { InvoiceService } from "./invoice.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { AddInvoiceLineDto } from "./dto/add-invoice-line.dto";
import { DisputeInvoiceLineDto } from "./dto/dispute-invoice-line.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("trips/:tripId/charge")
@UseGuards(JwtAuthGuard)
export class TripChargeController {
  constructor(private readonly charges: TripChargeService) {}

  @Post()
  @Audited({ action: "TRIP_CHARGE_COMPUTED", resourceType: "TripCharge" })
  compute(@CurrentUser() user: AuthenticatedUser, @Param("tripId") tripId: string) {
    return this.charges.computeForTrip(user, tripId);
  }

  @Get()
  get(@CurrentUser() user: AuthenticatedUser, @Param("tripId") tripId: string) {
    return this.charges.getForTrip(user, tripId);
  }
}

@Controller("invoices")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(private readonly invoices: InvoiceService) {}

  @Post()
  @Roles(PlatformRole.CORPORATE_FINANCE, PlatformRole.CORPORATE_TRANSPORT_ADMIN)
  @Audited({ action: "INVOICE_CREATED", resourceType: "Invoice" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInvoiceDto) {
    return this.invoices.createInvoice(user.organisationId, dto);
  }

  @Post(":id/lines")
  @Roles(PlatformRole.CORPORATE_FINANCE, PlatformRole.VENDOR_ADMIN)
  @Audited({ action: "INVOICE_LINE_ADDED", resourceType: "InvoiceLine" })
  addLine(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AddInvoiceLineDto) {
    return this.invoices.addLine(user, id, dto);
  }

  @Post("lines/:lineId/dispute")
  @Roles(PlatformRole.CORPORATE_FINANCE, PlatformRole.VENDOR_ADMIN)
  @Audited({ action: "INVOICE_LINE_DISPUTED", resourceType: "InvoiceLine" })
  disputeLine(@CurrentUser() user: AuthenticatedUser, @Param("lineId") lineId: string, @Body() dto: DisputeInvoiceLineDto) {
    return this.invoices.disputeLine(user, lineId, dto.reason);
  }

  @Post("lines/:lineId/approve")
  @Roles(PlatformRole.CORPORATE_FINANCE, PlatformRole.CORPORATE_TRANSPORT_ADMIN)
  @Audited({ action: "INVOICE_LINE_APPROVED", resourceType: "InvoiceLine" })
  approveLine(@CurrentUser() user: AuthenticatedUser, @Param("lineId") lineId: string) {
    return this.invoices.approveLine(user, lineId);
  }

  @Post(":id/submit")
  @Roles(PlatformRole.CORPORATE_FINANCE, PlatformRole.VENDOR_ADMIN)
  @Audited({ action: "INVOICE_SUBMITTED", resourceType: "Invoice" })
  submit(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invoices.submit(user, id);
  }

  @Post(":id/approve")
  @Roles(PlatformRole.CORPORATE_FINANCE)
  @Audited({ action: "INVOICE_APPROVED", resourceType: "Invoice" })
  approve(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.invoices.approve(user, id);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.invoices.listForOrganisation(user.organisationId);
  }
}
