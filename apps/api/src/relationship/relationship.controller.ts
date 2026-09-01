import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { RelationshipService } from "./relationship.service";
import { InviteRelationshipDto } from "./dto/invite-relationship.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("organisation-relationships")
@UseGuards(JwtAuthGuard)
export class RelationshipController {
  constructor(private readonly relationships: RelationshipService) {}

  @Post()
  @Audited({ action: "RELATIONSHIP_INVITED", resourceType: "OrganisationRelationship" })
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteRelationshipDto) {
    return this.relationships.invite(user, dto);
  }

  @Post(":id/accept")
  @Audited({ action: "RELATIONSHIP_ACCEPTED", resourceType: "OrganisationRelationship" })
  accept(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.relationships.accept(user, id);
  }

  @Post(":id/terminate")
  @Audited({ action: "RELATIONSHIP_TERMINATED", resourceType: "OrganisationRelationship" })
  terminate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.relationships.terminate(user, id);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.relationships.listForOrganisation(user.organisationId);
  }
}
