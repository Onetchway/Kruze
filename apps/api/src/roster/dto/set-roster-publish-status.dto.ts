import { IsIn, IsString } from "class-validator";

export class SetRosterPublishStatusDto {
  @IsString()
  shiftId!: string;

  @IsString()
  date!: string;

  @IsIn(["DRAFT", "PUBLISHED", "LOCKED"])
  publishStatus!: "DRAFT" | "PUBLISHED" | "LOCKED";
}
