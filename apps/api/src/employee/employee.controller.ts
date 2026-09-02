import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { ApiOperation } from "@nestjs/swagger";
import { EmployeeService } from "./employee.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { EmployeeSignupDto } from "./dto/employee-signup.dto";
import { ApproveEmployeeSignupDto, RejectEmployeeSignupDto } from "./dto/decide-employee-signup.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

const EMPLOYEE_ADMIN_ROLES = [
  PlatformRole.CORPORATE_TRANSPORT_ADMIN,
  PlatformRole.CORPORATE_TRANSPORT_MANAGER,
  PlatformRole.CORPORATE_TRANSPORT_SUPERVISOR,
  PlatformRole.CORPORATE_HR,
];

@Controller("employees")
export class EmployeeController {
  constructor(private readonly employees: EmployeeService) {}

  /** Public — a prospective employee names their employer by Kruze ID; no account required. */
  @Post("signup")
  @ApiOperation({ security: [] })
  @Audited({ action: "EMPLOYEE_SIGNUP_REQUESTED", resourceType: "Employee" })
  selfSignup(@Body() dto: EmployeeSignupDto) {
    return this.employees.selfSignup(dto);
  }

  @Get("pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EMPLOYEE_ADMIN_ROLES)
  listPending(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.listPendingForCorporate(user.organisationId);
  }

  @Post(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EMPLOYEE_ADMIN_ROLES)
  @Audited({ action: "EMPLOYEE_SIGNUP_APPROVED", resourceType: "Employee" })
  approveSignup(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ApproveEmployeeSignupDto) {
    return this.employees.approveSignup(user, id, dto.employeeCode);
  }

  @Post(":id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EMPLOYEE_ADMIN_ROLES)
  @Audited({ action: "EMPLOYEE_SIGNUP_REJECTED", resourceType: "Employee" })
  rejectSignup(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() _dto: RejectEmployeeSignupDto) {
    return this.employees.rejectSignup(user, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EMPLOYEE_ADMIN_ROLES)
  @Audited({ action: "EMPLOYEE_CREATED", resourceType: "Employee" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(user.organisationId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.listForCorporate(user.organisationId);
  }

  /** The Employee mobile app's own identity — must be registered before ":id" or it never matches. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.getOwnProfile(user);
  }

  @Get("me/trips/today")
  @UseGuards(JwtAuthGuard)
  myTripsToday(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.myTripsToday(user);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.employees.getForOrganisation(user, id);
  }

  @Get(":id/current-trip")
  @UseGuards(JwtAuthGuard)
  currentTripToday(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.employees.currentTripToday(user, id);
  }

  @Post(":id/deactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EMPLOYEE_ADMIN_ROLES)
  @Audited({ action: "EMPLOYEE_DEACTIVATED", resourceType: "Employee" })
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.employees.deactivate(user, id);
  }

  @Post(":id/reactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...EMPLOYEE_ADMIN_ROLES)
  @Audited({ action: "EMPLOYEE_REACTIVATED", resourceType: "Employee" })
  reactivate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.employees.reactivate(user, id);
  }
}
