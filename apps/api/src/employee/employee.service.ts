import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrganisationRole } from "@kruze/domain";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { OrganisationService } from "../organisation/organisation.service";

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organisations: OrganisationService,
  ) {}

  create(
    corporateOrgId: string,
    input: {
      employeeCode: string;
      fullName: string;
      gender?: string;
      phone: string;
      email?: string;
      department?: string;
      costCentre?: string;
      homeLatitude?: number;
      homeLongitude?: number;
      officeLabel?: string;
      shiftId?: string;
    },
  ) {
    return this.prisma.employee.create({
      data: { corporateOrgId, ...input, status: "ACTIVE" },
    });
  }

  listForCorporate(corporateOrgId: string) {
    return this.prisma.employee.findMany({
      where: { corporateOrgId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  async getForOrganisation(actor: AuthenticatedUser, employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }
    if (employee.corporateOrgId !== actor.organisationId) {
      throw new ForbiddenException("Employee belongs to a different corporate");
    }
    return employee;
  }

  async deactivate(actor: AuthenticatedUser, employeeId: string) {
    await this.getForOrganisation(actor, employeeId);
    return this.prisma.employee.update({ where: { id: employeeId }, data: { status: "INACTIVE" } });
  }

  /**
   * Public self-service signup (spec §29: employee-initiated pickup/onboarding
   * requests need corporate approval, not automatic activation). No user
   * account is required — the employee just names the corporate they belong
   * to by its Kruze ID; the record sits PENDING_APPROVAL until an admin acts.
   */
  async selfSignup(input: { globalOrgId: string; fullName: string; phone: string; email?: string; department?: string }) {
    const org = await this.organisations.findByGlobalId(input.globalOrgId);
    if (!org.roles.includes(OrganisationRole.CORPORATE)) {
      throw new BadRequestException("That Kruze ID does not belong to a corporate organisation");
    }
    if (org.status !== "ACTIVE") {
      throw new BadRequestException("That corporate organisation is not active");
    }
    return this.prisma.employee.create({
      data: {
        corporateOrgId: org.id,
        employeeCode: `SIGNUP-${Date.now().toString(36).toUpperCase()}`,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        department: input.department,
        status: "PENDING_APPROVAL",
      },
    });
  }

  listPendingForCorporate(corporateOrgId: string) {
    return this.prisma.employee.findMany({
      where: { corporateOrgId, status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "asc" },
    });
  }

  async approveSignup(actor: AuthenticatedUser, employeeId: string, employeeCode?: string) {
    const employee = await this.getPending(actor, employeeId);
    return this.prisma.employee.update({
      where: { id: employee.id },
      data: { status: "ACTIVE", employeeCode: employeeCode ?? employee.employeeCode },
    });
  }

  async rejectSignup(actor: AuthenticatedUser, employeeId: string) {
    const employee = await this.getPending(actor, employeeId);
    return this.prisma.employee.update({ where: { id: employee.id }, data: { status: "REJECTED" } });
  }

  private async getPending(actor: AuthenticatedUser, employeeId: string) {
    const employee = await this.getForOrganisation(actor, employeeId);
    if (employee.status !== "PENDING_APPROVAL") {
      throw new BadRequestException(`Signup request is not pending (status=${employee.status})`);
    }
    return employee;
  }
}
