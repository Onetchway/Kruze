import { IsString } from "class-validator";

export class CreateSubscriptionDto {
  @IsString()
  organisationId!: string;

  @IsString()
  planId!: string;
}
