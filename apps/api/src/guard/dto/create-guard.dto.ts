import { IsString, MinLength } from "class-validator";

export class CreateGuardDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  phone!: string;
}
