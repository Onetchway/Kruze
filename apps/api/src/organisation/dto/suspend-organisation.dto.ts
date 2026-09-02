import { IsOptional, IsString, MinLength } from "class-validator";

export class SuspendOrganisationDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class ReactivateOrganisationDto {
  @IsOptional()
  @IsString()
  note?: string;
}
