import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { OtpService } from "./otp.service";
import { GenerateOtpDto } from "./dto/generate-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { OverrideOtpDto } from "./dto/override-otp.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller()
@UseGuards(JwtAuthGuard)
export class OtpController {
  constructor(private readonly otp: OtpService) {}

  @Post("otp-challenges")
  @Audited({ action: "OTP_GENERATED", resourceType: "OtpChallenge" })
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateOtpDto) {
    return this.otp.generate(user, dto);
  }

  @Post("otp-challenges/:id/verify")
  @Audited({ action: "OTP_VERIFIED", resourceType: "OtpChallenge" })
  verify(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: VerifyOtpDto) {
    const location = dto.latitude !== undefined && dto.longitude !== undefined
      ? { latitude: dto.latitude, longitude: dto.longitude }
      : undefined;
    return this.otp.verify(user, id, dto.code, location);
  }

  @Post("otp-challenges/:id/override")
  @Audited({ action: "OTP_OVERRIDDEN", resourceType: "OtpChallenge" })
  override(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: OverrideOtpDto) {
    return this.otp.override(user, id, dto.reason);
  }
}
