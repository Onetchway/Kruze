import { IsEnum, IsOptional, IsString } from "class-validator";
import { TripStatus } from "../../../generated/prisma";

export class TransitionTripDto {
  @IsEnum(TripStatus)
  status!: TripStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
