import { ArrayNotEmpty, IsArray, IsDateString, IsOptional, IsString } from "class-validator";

export class CreateTripStopDto {
  @IsString()
  stopType!: string;

  latitude!: number;
  longitude!: number;
}

export class CreateTripDto {
  @IsString()
  shiftId!: string;

  @IsDateString()
  scheduledStartAt!: string;

  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @IsOptional()
  @IsString()
  vendorOrgId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  employeeIds!: string[];
}
