import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from "class-validator";
import { LocationType, PickupPointType } from "../../../generated/prisma";

/** An employee/manager proposes a new location; corporate approves/rejects (see LocationController#requests). */
export class CreateLocationRequestDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsEnum(PickupPointType)
  pickupPointType?: PickupPointType;

  @IsOptional()
  @IsString()
  reason?: string;
}
