import { IsDateString, IsString } from "class-validator";

export class CreateInvoiceDto {
  @IsString()
  vendorOrgId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
