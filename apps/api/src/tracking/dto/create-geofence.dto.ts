import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateGeofenceDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsNumber()
  centerLatitude!: number;

  @IsNumber()
  centerLongitude!: number;

  @IsInt()
  @Min(1)
  radiusMeters!: number;

  @IsOptional()
  @IsString()
  corporateOrgId?: string;
}
