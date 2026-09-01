import { IsOptional, IsString } from "class-validator";

export class ApproveEmployeeSignupDto {
  /** Lets the admin replace the auto-generated signup code with the corporate's real employee code. */
  @IsOptional()
  @IsString()
  employeeCode?: string;
}

export class RejectEmployeeSignupDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
