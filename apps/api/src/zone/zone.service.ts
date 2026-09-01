import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateZoneDto } from "./dto/create-zone.dto";

@Injectable()
export class ZoneService {
  constructor(private readonly prisma: PrismaService) {}

  listForOrganisation(corporateOrgId: string) {
    return this.prisma.zone.findMany({
      where: { corporateOrgId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(corporateOrgId: string, dto: CreateZoneDto) {
    const existing = await this.prisma.zone.findUnique({
      where: { corporateOrgId_code: { corporateOrgId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException("A zone with this code already exists");
    }
    return this.prisma.zone.create({ data: { corporateOrgId, ...dto } });
  }

  async remove(corporateOrgId: string, id: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone || zone.corporateOrgId !== corporateOrgId) {
      throw new NotFoundException("Zone not found");
    }
    return this.prisma.zone.update({ where: { id }, data: { status: "INACTIVE" } });
  }
}
