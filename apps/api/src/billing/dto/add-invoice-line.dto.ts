import { IsNumber, IsString } from "class-validator";

export class AddInvoiceLineDto {
  @IsString()
  tripId!: string;

  @IsNumber()
  claimedAmount!: number;
}
