import { Module } from "@nestjs/common";
import { RelationshipService } from "./relationship.service";
import { RelationshipController } from "./relationship.controller";

@Module({
  providers: [RelationshipService],
  controllers: [RelationshipController],
  exports: [RelationshipService],
})
export class RelationshipModule {}
