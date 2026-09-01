import { IsEnum, IsString } from "class-validator";
import { OrganisationRelationshipType } from "@kruze/domain";

export class InviteRelationshipDto {
  @IsString()
  targetOrgId!: string;

  @IsEnum(OrganisationRelationshipType)
  type!: OrganisationRelationshipType;
}
