import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class CreatePlanDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  features!: string[];
}
