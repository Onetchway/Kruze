import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@kruze/domain";
import { EmployeeService } from "./employee.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../authz/roles.guard";
import { Roles } from "../authz/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("employees")
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly employees: EmployeeService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_HR)
  @Audited({ action: "EMPLOYEE_CREATED", resourceType: "Employee" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(user.organisationId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.employees.listForCorporate(user.organisationId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.employees.getForOrganisation(user, id);
  }

  @Post(":id/deactivate")
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.CORPORATE_TRANSPORT_ADMIN, PlatformRole.CORPORATE_HR)
  @Audited({ action: "EMPLOYEE_DEACTIVATED", resourceType: "Employee" })
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.employees.deactivate(user, id);
  }
}
