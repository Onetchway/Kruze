import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateLocationDto } from "./dto/create-location.dto";

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  listForOrganisation(organisationId: string) {
    return this.prisma.location.findMany({
      where: { corporateOrgId: organisationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(organisationId: string, dto: CreateLocationDto) {
    const existing = await this.prisma.location.findUnique({
      where: { corporateOrgId_code: { corporateOrgId: organisationId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException("A drop location with this code already exists");
    }
    return this.prisma.location.create({ data: { corporateOrgId: organisationId, ...dto } });
  }

  async remove(organisationId: string, id: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location || location.corporateOrgId !== organisationId) {
      throw new NotFoundException("Drop location not found");
    }
    return this.prisma.location.update({ where: { id }, data: { status: "INACTIVE" } });
  }
}
