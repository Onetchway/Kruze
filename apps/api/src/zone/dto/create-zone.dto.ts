import { IsString, MinLength } from "class-validator";

export class CreateZoneDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  code!: string;
}
