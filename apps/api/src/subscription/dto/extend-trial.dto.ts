import { IsInt, Min } from "class-validator";

export class ExtendTrialDto {
  @IsInt()
  @Min(1)
  days!: number;
}
