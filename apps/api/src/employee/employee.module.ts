import { Module } from "@nestjs/common";
import { EmployeeService } from "./employee.service";
import { EmployeeController } from "./employee.controller";
import { OrganisationModule } from "../organisation/organisation.module";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [OrganisationModule, IdentityModule],
  providers: [EmployeeService],
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}
