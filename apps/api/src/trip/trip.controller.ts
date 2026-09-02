import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CreateTripDto } from "./dto/create-trip.dto";
import { TransitionTripDto } from "./dto/transition-trip.dto";
import { AssignTripDto } from "./dto/assign-trip.dto";
import { TripService } from "./trip.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";
import { Audited } from "../audit/audited.decorator";

@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripController {
  constructor(private readonly trips: TripService) {}

  @Post()
  @Audited({ action: "TRIP_CREATED", resourceType: "Trip" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: string,
    @Query("vendorOrgId") vendorOrgId?: string,
    @Query("shiftId") shiftId?: string,
    @Query("driverId") driverId?: string,
    @Query("vehicleId") vehicleId?: string,
    @Query("officeLabel") officeLabel?: string,
  ) {
    return this.trips.listForOrganisation(user.organisationId, { status, vendorOrgId, shiftId, driverId, vehicleId, officeLabel });
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.trips.get(user, id);
  }

  @Post(":id/transition")
  @Audited({ action: "TRIP_TRANSITIONED", resourceType: "Trip" })
  transition(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: TransitionTripDto) {
    return this.trips.transition(user, id, dto.status, dto.reason);
  }

  @Post(":id/assignments")
  @Audited({ action: "TRIP_ASSIGNMENT_CREATED", resourceType: "TripAssignment" })
  assign(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AssignTripDto) {
    return this.trips.assign(user, id, dto);
  }

  @Post(":id/accept-route")
  @Audited({ action: "TRIP_ROUTE_ACCEPTED", resourceType: "Trip" })
  acceptRoute(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.trips.acceptRoute(user, id);
  }

  @Post(":id/reject-route")
  @Audited({ action: "TRIP_ROUTE_REJECTED", resourceType: "Trip" })
  rejectRoute(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.trips.rejectRoute(user, id);
  }

  @Post(":id/request-reoptimization")
  @Audited({ action: "TRIP_REOPTIMIZATION_REQUESTED", resourceType: "Trip" })
  requestReoptimization(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.trips.requestReoptimization(user, id);
  }
}
