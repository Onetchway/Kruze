import { IsEmail, IsString, MinLength } from "class-validator";

export class ClaimGuardAccountDto {
  @IsString()
  globalGuardId!: string;

  @IsString()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
