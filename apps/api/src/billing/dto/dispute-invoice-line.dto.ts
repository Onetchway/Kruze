import { IsString, MinLength } from "class-validator";

export class DisputeInvoiceLineDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
