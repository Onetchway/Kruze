import { IsEmail, IsString, MinLength } from "class-validator";

export class ClaimDriverAccountDto {
  @IsString()
  globalDriverId!: string;

  @IsString()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
