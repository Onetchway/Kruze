import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString } from "class-validator";
import { LocationType, PickupPointType } from "../../../generated/prisma";

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

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
}
