import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { UpdateCorporateSettingsDto } from "./dto/update-corporate-settings.dto";

@Injectable()
export class CorporateService {
  constructor(private readonly prisma: PrismaService) {}

  /** A Corporate settings row is created lazily on first read/write — not every corporate org has one yet. */
  getSettings(organisationId: string) {
    return this.prisma.corporate.upsert({
      where: { organisationId },
      update: {},
      create: { organisationId },
    });
  }

  async updateSettings(organisationId: string, dto: UpdateCorporateSettingsDto) {
    let mergedConfig: Record<string, unknown> | undefined = dto.config;
    if (dto.config) {
      const existing = await this.prisma.corporate.findUnique({ where: { organisationId } });
      const existingConfig = (existing?.config as Record<string, unknown> | null) ?? {};
      mergedConfig = { ...existingConfig, ...dto.config };
    }

    const { config: _config, ...rest } = dto;
    const data = {
      ...rest,
      ...(mergedConfig !== undefined ? { config: mergedConfig as never } : {}),
      contractStartsAt: dto.contractStartsAt ? new Date(dto.contractStartsAt) : undefined,
      contractEndsAt: dto.contractEndsAt ? new Date(dto.contractEndsAt) : undefined,
    };

    return this.prisma.corporate.upsert({
      where: { organisationId },
      update: data,
      create: { organisationId, ...data },
    });
  }
}
