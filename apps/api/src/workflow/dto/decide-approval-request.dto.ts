import { IsOptional, IsString } from "class-validator";

export class DecideApprovalRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
