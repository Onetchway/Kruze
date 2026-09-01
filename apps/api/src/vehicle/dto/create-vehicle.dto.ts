import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateVehicleDto {
  @IsString()
  @MinLength(2)
  registrationNo!: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  ownershipType?: string;

  @IsOptional()
  @IsBoolean()
  isElectric?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  batteryCapacityKwh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rangeKm?: number;
}
