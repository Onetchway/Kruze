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

  updateSettings(organisationId: string, dto: UpdateCorporateSettingsDto) {
    return this.prisma.corporate.upsert({
      where: { organisationId },
      update: {
        ...dto,
        contractStartsAt: dto.contractStartsAt ? new Date(dto.contractStartsAt) : undefined,
        contractEndsAt: dto.contractEndsAt ? new Date(dto.contractEndsAt) : undefined,
      },
      create: {
        organisationId,
        ...dto,
        contractStartsAt: dto.contractStartsAt ? new Date(dto.contractStartsAt) : undefined,
        contractEndsAt: dto.contractEndsAt ? new Date(dto.contractEndsAt) : undefined,
      },
    });
  }
}
