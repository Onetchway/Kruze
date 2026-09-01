import { IsString, MinLength } from "class-validator";

export class CloseIncidentDto {
  @IsString()
  @MinLength(3)
  correctiveAction!: string;
}
