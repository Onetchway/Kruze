import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { ShiftService } from "./shift.service";
import { RosterService } from "./roster.service";
import { CreateShiftDto } from "./dto/create-shift.dto";
import { UpdateShiftDto } from "./dto/update-shift.dto";
import { UpsertRosterEntryDto } from "./dto/upsert-roster-entry.dto";
import { BulkUpsertRosterDto } from "./dto/bulk-upsert-roster.dto";
import { BulkUploadRosterDto } from "./dto/bulk-upload-roster.dto";
import { AutoGenerateRosterDto } from "./dto/auto-generate-roster.dto";
import { SetRosterPublishStatusDto } from "./dto/set-roster-publish-status.dto";
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
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_TRANSPORT_MANAGER, PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR)
  @Audited({ action: "SHIFT_CREATED", resourceType: "Shift" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShiftDto) {
    return this.shifts.create(user.organisationId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.shifts.listForCorporate(user.organisationId);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_TRANSPORT_MANAGER, PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR)
  @Audited({ action: "SHIFT_UPDATED", resourceType: "Shift" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateShiftDto) {
    return this.shifts.update(user.organisationId, id, dto);
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

  @Post("bulk")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_TRANSPORT_MANAGER, PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR)
  @Audited({ action: "ROSTER_ENTRY_UPSERTED", resourceType: "RosterEntry" })
  bulkUpsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkUpsertRosterDto) {
    return this.roster.bulkUpsert(user, dto);
  }

  @Post("bulk-upload")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_TRANSPORT_MANAGER, PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR)
  @Audited({ action: "ROSTER_BULK_UPLOADED", resourceType: "RosterEntry" })
  bulkUpload(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkUploadRosterDto) {
    return this.roster.bulkUpload(user, dto.rows);
  }

  @Post("auto-generate")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_TRANSPORT_MANAGER, PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR)
  @Audited({ action: "ROSTER_AUTO_GENERATED", resourceType: "RosterEntry" })
  autoGenerate(@CurrentUser() user: AuthenticatedUser, @Body() dto: AutoGenerateRosterDto) {
    return this.roster.autoGenerate(user, dto);
  }

  @Post("publish-status")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_TRANSPORT_MANAGER, PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR)
  @Audited({ action: "ROSTER_PUBLISH_STATUS_SET", resourceType: "RosterEntry" })
  setPublishStatus(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetRosterPublishStatusDto) {
    return this.roster.setPublishStatus(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("shiftId") shiftId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.roster.listForCorporate(user, { shiftId, from, to });
  }

  @Get("requests")
  requests(@CurrentUser() user: AuthenticatedUser, @Query("from") from?: string, @Query("to") to?: string) {
    return this.roster.listRequestsForCorporate(user, { from, to });
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
