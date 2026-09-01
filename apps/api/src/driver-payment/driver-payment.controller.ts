import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { DriverPaymentService } from "./driver-payment.service";
import { GenerateVoucherDto } from "./dto/generate-voucher.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { Audited } from "../audit/audited.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";

@Controller("driver-payment-vouchers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PlatformRole.VENDOR_ADMIN, PlatformRole.FLEET_OPERATOR_ADMIN)
export class DriverPaymentController {
  constructor(private readonly vouchers: DriverPaymentService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.vouchers.listForVendor(user.organisationId);
  }

  @Post("generate")
  @Audited({ action: "DRIVER_PAYMENT_VOUCHER_GENERATED", resourceType: "DriverPaymentVoucher" })
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateVoucherDto) {
    return this.vouchers.generate(user.organisationId, dto);
  }

  @Post(":id/lock")
  @Audited({ action: "DRIVER_PAYMENT_VOUCHER_LOCKED", resourceType: "DriverPaymentVoucher" })
  lock(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.vouchers.lock(user.organisationId, id);
  }
}
