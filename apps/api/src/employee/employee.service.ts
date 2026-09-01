import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

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
}
