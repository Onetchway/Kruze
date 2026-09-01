import { IsString, MinLength } from "class-validator";

export class CreateSafetyPolicyDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
