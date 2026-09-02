import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreatePlanDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  features!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPriceCents?: number;
}
