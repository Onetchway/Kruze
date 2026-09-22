import { Body, Controller, Get, Param, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { createReadStream } from "fs";
import { SUPER_ADMIN_ROLES } from "@kruze/domain";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";
import { PlatformExportService } from "./platform-export.service";

/** Data Export system (spec §68) — synchronous-generation, minimal-scope pass; see PlatformExportService for details. */
@Controller("platform/exports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
export class PlatformExportController {
  constructor(private readonly service: PlatformExportService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMine(user.userId);
  }

  @Post()
  @Audited({ action: "EXPORT_JOB_CREATED", resourceType: "ExportJob" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: { entityType: string }) {
    return this.service.createExport(user.userId, body.entityType);
  }

  @Get(":id/download")
  async download(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const { fileName, filePath } = await this.service.getDownload(id, user.userId);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    createReadStream(filePath).pipe(res);
  }
}
