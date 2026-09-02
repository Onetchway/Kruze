import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrganisationRole, PlatformRole } from "@kruze/domain";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { OrganisationService } from "../organisation/organisation.service";
import { UsersService } from "../identity/users.service";

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organisations: OrganisationService,
    private readonly users: UsersService,
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

  /**
   * The Employees list needs Location/Pickup/Vendor/Current-Trip columns
   * without an N+1 query per row: one query for employees (+ shift +
   * pickupLocation), one batched query for today's trip-employee rows
   * across all of them, merged in memory.
   */
  async listForCorporate(corporateOrgId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { corporateOrgId, status: "ACTIVE" },
      include: { shift: true, pickupLocation: true },
      orderBy: { createdAt: "desc" },
    });

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const todaysTripEmployees = employees.length
      ? await this.prisma.tripEmployee.findMany({
          where: {
            employeeId: { in: employees.map((e) => e.id) },
            trip: { scheduledStartAt: { gte: dayStart, lt: dayEnd }, status: { notIn: ["CANCELLED", "FAILED"] } },
          },
          include: {
            trip: { select: { id: true, globalTripId: true, status: true, scheduledStartAt: true, vendorOrg: true } },
            pickupStop: { select: { plannedEta: true } },
          },
        })
      : [];
    const tripByEmployeeId = new Map(todaysTripEmployees.map((te) => [te.employeeId, te]));

    return employees.map((e) => {
      const te = tripByEmployeeId.get(e.id);
      return {
        ...e,
        currentTrip: te
          ? {
              id: te.trip.id,
              globalTripId: te.trip.globalTripId,
              status: te.trip.status,
              vendorOrg: te.trip.vendorOrg,
              pickupEta: te.pickupStop?.plannedEta ?? null,
            }
          : null,
      };
    });
  }

  async getForOrganisation(actor: AuthenticatedUser, employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true, pickupLocation: true },
    });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }
    if (employee.corporateOrgId !== actor.organisationId) {
      throw new ForbiddenException("Employee belongs to a different corporate");
    }
    return employee;
  }

  /** Today's trip (if any) this employee is booked on — for the employee detail screen's "current trip" panel. */
  async currentTripToday(actor: AuthenticatedUser, employeeId: string) {
    await this.getForOrganisation(actor, employeeId);
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const tripEmployee = await this.prisma.tripEmployee.findFirst({
      where: {
        employeeId,
        trip: { scheduledStartAt: { gte: dayStart, lt: dayEnd }, status: { notIn: ["CANCELLED", "FAILED"] } },
      },
      include: {
        trip: {
          include: { assignments: { where: { status: "ACTIVE" }, include: { driver: true, vehicle: true, guard: true } } },
        },
      },
      orderBy: { trip: { scheduledStartAt: "desc" } },
    });
    return tripEmployee?.trip ?? null;
  }

  /** Edit an employee's own profile fields — location, contact, requirements, shift, etc. */
  async update(
    actor: AuthenticatedUser,
    employeeId: string,
    input: {
      fullName?: string;
      gender?: string;
      phone?: string;
      email?: string;
      department?: string;
      costCentre?: string;
      homeLatitude?: number;
      homeLongitude?: number;
      officeLabel?: string;
      shiftId?: string;
      pickupLocationId?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      specialRequirements?: string[];
    },
  ) {
    await this.getForOrganisation(actor, employeeId);
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: input,
      include: { shift: true, pickupLocation: true },
    });
  }

  /**
   * Distinct from enable/disable transport (which flips account `status`):
   * this records whether the employee is eligible for transport at all
   * (distance/zone/policy-driven) and why, and is a separate corporate
   * decision from whether the account is active.
   */
  async setTransportEligibility(
    actor: AuthenticatedUser,
    employeeId: string,
    input: { transportEligible: boolean; eligibilityReason?: string },
  ) {
    await this.getForOrganisation(actor, employeeId);
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { transportEligible: input.transportEligible, eligibilityReason: input.eligibilityReason },
    });
  }

  /** Past trips this employee has been booked on — the booking/trip history view. */
  async tripHistory(actor: AuthenticatedUser, employeeId: string, limit = 50) {
    await this.getForOrganisation(actor, employeeId);
    const tripEmployees = await this.prisma.tripEmployee.findMany({
      where: { employeeId },
      include: {
        trip: {
          include: {
            shift: true,
            vendorOrg: true,
            assignments: { where: { status: "ACTIVE" }, include: { driver: true, vehicle: true, guard: true } },
          },
        },
      },
      orderBy: { trip: { scheduledStartAt: "desc" } },
      take: limit,
    });
    return tripEmployees.map((te) => ({ tripEmployeeStatus: te.status, ...te.trip }));
  }

  async deactivate(actor: AuthenticatedUser, employeeId: string) {
    await this.getForOrganisation(actor, employeeId);
    return this.prisma.employee.update({ where: { id: employeeId }, data: { status: "INACTIVE" } });
  }

  async reactivate(actor: AuthenticatedUser, employeeId: string) {
    await this.getForOrganisation(actor, employeeId);
    return this.prisma.employee.update({ where: { id: employeeId }, data: { status: "ACTIVE" } });
  }

  /**
   * Public self-service signup (spec §29: employee-initiated pickup/onboarding
   * requests need corporate approval, not automatic activation). Creates a
   * login-capable User account immediately (so the mobile app can identify
   * the person), but no OrganisationMembership — and therefore no session —
   * until the corporate approves (see `approveSignup`). The Employee record
   * sits PENDING_APPROVAL until then.
   */
  async selfSignup(input: {
    globalOrgId: string;
    fullName: string;
    phone: string;
    email?: string;
    department?: string;
    password: string;
  }) {
    const org = await this.organisations.findByGlobalId(input.globalOrgId);
    if (!org.roles.includes(OrganisationRole.CORPORATE)) {
      throw new BadRequestException("That Kruze ID does not belong to a corporate organisation");
    }
    if (org.status !== "ACTIVE") {
      throw new BadRequestException("That corporate organisation is not active");
    }
    if (!input.email) {
      throw new BadRequestException("Email is required to create a login for the mobile app");
    }
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const user = await this.users.createWithPassword({
      email: input.email,
      password: input.password,
      displayName: input.fullName,
    });

    return this.prisma.employee.create({
      data: {
        corporateOrgId: org.id,
        userId: user.id,
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
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id: employee.id },
        data: { status: "ACTIVE", employeeCode: employeeCode ?? employee.employeeCode },
      });
      if (employee.userId) {
        const existingMembership = await tx.organisationMembership.findFirst({
          where: { userId: employee.userId, organisationId: employee.corporateOrgId, role: PlatformRole.EMPLOYEE },
        });
        if (!existingMembership) {
          await tx.organisationMembership.create({
            data: {
              userId: employee.userId,
              organisationId: employee.corporateOrgId,
              role: PlatformRole.EMPLOYEE,
              status: "ACTIVE",
            },
          });
        }
      }
      return updated;
    });
  }

  async rejectSignup(actor: AuthenticatedUser, employeeId: string) {
    const employee = await this.getPending(actor, employeeId);
    return this.prisma.employee.update({ where: { id: employee.id }, data: { status: "REJECTED" } });
  }

  /** The employee record linked to the caller's own account — used by the Employee mobile app. */
  async getOwnProfile(actor: AuthenticatedUser) {
    const employee = await this.prisma.employee.findUnique({ where: { userId: actor.userId } });
    if (!employee) {
      throw new NotFoundException("No employee profile linked to this account");
    }
    return employee;
  }

  async myTripsToday(actor: AuthenticatedUser) {
    const employee = await this.getOwnProfile(actor);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    return this.prisma.tripEmployee.findMany({
      where: {
        employeeId: employee.id,
        trip: { scheduledStartAt: { gte: startOfDay, lt: endOfDay } },
      },
      include: {
        trip: { include: { assignments: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { trip: { scheduledStartAt: "asc" } },
    });
  }

  private async getPending(actor: AuthenticatedUser, employeeId: string) {
    const employee = await this.getForOrganisation(actor, employeeId);
    if (employee.status !== "PENDING_APPROVAL") {
      throw new BadRequestException(`Signup request is not pending (status=${employee.status})`);
    }
    return employee;
  }
}
