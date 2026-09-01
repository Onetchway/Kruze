import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { ShiftService } from "./shift.service";
import { RosterService } from "./roster.service";
import { CreateShiftDto } from "./dto/create-shift.dto";
import { UpsertRosterEntryDto } from "./dto/upsert-roster-entry.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("shifts")
@UseGuards(JwtAuthGuard)
export class ShiftController {
  constructor(private readonly shifts: ShiftService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN)
  @Audited({ action: "SHIFT_CREATED", resourceType: "Shift" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShiftDto) {
    return this.shifts.create(user.organisationId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.shifts.listForCorporate(user.organisationId);
  }
}

@Controller("roster-entries")
@UseGuards(JwtAuthGuard)
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @Post()
  @Audited({ action: "ROSTER_ENTRY_UPSERTED", resourceType: "RosterEntry" })
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertRosterEntryDto) {
    return this.roster.upsertEntry(user, dto);
  }

  @Post(":id/cancel")
  @Audited({ action: "ROSTER_ENTRY_CANCELLED", resourceType: "RosterEntry" })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.roster.cancel(user, id);
  }

  @Get("demand")
  demand(@Query("shiftId") shiftId: string, @Query("date") date: string) {
    return this.roster.listDemand(shiftId, date);
  }
}
