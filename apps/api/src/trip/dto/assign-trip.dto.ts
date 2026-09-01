import { IsEnum, IsOptional, IsString } from "class-validator";
import { AssignmentSource } from "../../../generated/prisma";

export class AssignTripDto {
  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  guardId?: string;

  @IsOptional()
  @IsEnum(AssignmentSource)
  source?: AssignmentSource;

  @IsOptional()
  @IsString()
  overrideReason?: string;
}
