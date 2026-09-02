import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { CreateLocationRequestDto } from "./dto/create-location-request.dto";

const LOCATION_REQUEST_WORKFLOW = "LOCATION_REQUEST";
const LOCATION_REQUEST_RESOURCE_TYPE = "Location";

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

  async update(organisationId: string, id: string, dto: UpdateLocationDto) {
    const location = await this.getOwned(organisationId, id);
    return this.prisma.location.update({ where: { id: location.id }, data: dto });
  }

  async remove(organisationId: string, id: string) {
    const location = await this.getOwned(organisationId, id);
    return this.prisma.location.update({ where: { id: location.id }, data: { status: "INACTIVE" } });
  }

  private async getOwned(organisationId: string, id: string) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location || location.corporateOrgId !== organisationId) {
      throw new NotFoundException("Drop location not found");
    }
    return location;
  }

  // -- New-location approval workflow (spec §4: employees can request a
  // new location; corporate approves/rejects) -- built on the generic
  // ApprovalRequest primitive rather than a bespoke table, matching every
  // other approval flow on this platform.

  requestLocation(actor: AuthenticatedUser, organisationId: string, dto: CreateLocationRequestDto) {
    return this.prisma.approvalRequest.create({
      data: {
        workflowType: LOCATION_REQUEST_WORKFLOW,
        resourceType: LOCATION_REQUEST_RESOURCE_TYPE,
        resourceId: "pending",
        organisationId,
        requestedByUserId: actor.userId,
        context: dto as never,
      },
    });
  }

  listLocationRequests(organisationId: string, status?: string) {
    return this.prisma.approvalRequest.findMany({
      where: {
        workflowType: LOCATION_REQUEST_WORKFLOW,
        organisationId,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveLocationRequest(actor: AuthenticatedUser, organisationId: string, requestId: string) {
    const request = await this.getPendingRequest(organisationId, requestId);
    const context = request.context as Record<string, unknown>;
    const code = `LOC-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const location = await tx.location.create({
        data: {
          corporateOrgId: organisationId,
          name: String(context.name ?? "Requested location"),
          code,
          address: (context.address as string) ?? undefined,
          city: (context.city as string) ?? undefined,
          latitude: (context.latitude as number) ?? undefined,
          longitude: (context.longitude as number) ?? undefined,
          type: (context.type as never) ?? undefined,
          pickupPointType: (context.pickupPointType as never) ?? undefined,
        },
      });
      await tx.approvalRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", resourceId: location.id, decidedByUserId: actor.userId, decidedAt: new Date() },
      });
      return location;
    });
  }

  async rejectLocationRequest(actor: AuthenticatedUser, organisationId: string, requestId: string, reason?: string) {
    const request = await this.getPendingRequest(organisationId, requestId);
    return this.prisma.approvalRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", decidedByUserId: actor.userId, decisionReason: reason, decidedAt: new Date() },
    });
  }

  private async getPendingRequest(organisationId: string, requestId: string) {
    const request = await this.prisma.approvalRequest.findUnique({ where: { id: requestId } });
    if (!request || request.workflowType !== LOCATION_REQUEST_WORKFLOW) {
      throw new NotFoundException("Location request not found");
    }
    if (request.organisationId !== organisationId) {
      throw new ForbiddenException("Not authorized to act on another corporate's location request");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestException(`Location request is not pending (status=${request.status})`);
    }
    return request;
  }
}
