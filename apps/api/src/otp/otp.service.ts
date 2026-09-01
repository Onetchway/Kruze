import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { randomInt } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthenticatedUser } from "../common/request-context";
import { OtpPurpose } from "../../generated/prisma";

const OTP_TTL_MINUTES = 5;
const OTP_LENGTH = 6;

/**
 * Pickup/drop OTP + proof-of-service (spec §11 / §10). Only a hash is
 * persisted — the plaintext code is returned once at generation time (in a
 * production deployment this would go out over push/SMS, never sit in
 * logs) and can never be recovered afterwards. Pickup and drop OTPs are
 * always distinct challenges bound to trip + employee + purpose.
 */
@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(actor: AuthenticatedUser, input: { tripEmployeeId: string; purpose: OtpPurpose }) {
    const tripEmployee = await this.prisma.tripEmployee.findUnique({
      where: { id: input.tripEmployeeId },
      include: { trip: true },
    });
    if (!tripEmployee) {
      throw new NotFoundException("Trip employee not found");
    }
    if (tripEmployee.trip.corporateOrgId !== actor.organisationId && tripEmployee.trip.vendorOrgId !== actor.organisationId) {
      throw new ForbiddenException("Not a party to this trip");
    }
    if (actor.role === "EMPLOYEE") {
      const ownEmployee = await this.prisma.employee.findUnique({ where: { userId: actor.userId } });
      if (ownEmployee?.id !== tripEmployee.employeeId) {
        throw new ForbiddenException("An employee may only generate their own pickup/drop OTP");
      }
    }

    const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        tripId: tripEmployee.tripId,
        tripEmployeeId: input.tripEmployeeId,
        purpose: input.purpose,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
      },
    });

    await this.prisma.tripEvent.create({
      data: {
        tripId: tripEmployee.tripId,
        type: `OTP_${input.purpose}_GENERATED`,
        actorUserId: actor.userId,
        metadata: { tripEmployeeId: input.tripEmployeeId, otpChallengeId: challenge.id },
      },
    });

    // Returned once, out-of-band from persisted storage — never logged.
    return { otpChallengeId: challenge.id, code, expiresAt: challenge.expiresAt };
  }

  /**
   * Lets a party to the trip (chiefly the driver, who does not generate the
   * challenge and so never sees its id in the generate response) look up
   * the id of the currently pending challenge for a passenger, without
   * exposing the code itself.
   */
  async findPending(actor: AuthenticatedUser, tripEmployeeId: string, purpose: OtpPurpose) {
    const tripEmployee = await this.prisma.tripEmployee.findUnique({
      where: { id: tripEmployeeId },
      include: { trip: true },
    });
    if (!tripEmployee) {
      throw new NotFoundException("Trip employee not found");
    }
    if (tripEmployee.trip.corporateOrgId !== actor.organisationId && tripEmployee.trip.vendorOrgId !== actor.organisationId) {
      throw new ForbiddenException("Not a party to this trip");
    }
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { tripEmployeeId, purpose, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) {
      throw new NotFoundException("No pending OTP for this passenger");
    }
    return { otpChallengeId: challenge.id, expiresAt: challenge.expiresAt };
  }

  async verify(actor: AuthenticatedUser, otpChallengeId: string, code: string, location?: { latitude: number; longitude: number }) {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.otpChallenge.findUnique({
        where: { id: otpChallengeId },
        include: { tripEmployee: true, trip: true },
      });
      if (!challenge) {
        throw new NotFoundException("OTP challenge not found");
      }
      if (challenge.trip.corporateOrgId !== actor.organisationId && challenge.trip.vendorOrgId !== actor.organisationId) {
        throw new ForbiddenException("Not a party to this trip");
      }
      if (challenge.status !== "PENDING") {
        throw new BadRequestException(`OTP is not pending (status=${challenge.status})`);
      }
      if (challenge.expiresAt < new Date()) {
        await tx.otpChallenge.update({ where: { id: otpChallengeId }, data: { status: "EXPIRED" } });
        throw new BadRequestException("OTP has expired");
      }
      if (challenge.attempts >= challenge.maxAttempts) {
        await tx.otpChallenge.update({ where: { id: otpChallengeId }, data: { status: "LOCKED" } });
        throw new BadRequestException("OTP is locked after too many attempts");
      }

      const isValid = await argon2.verify(challenge.codeHash, code);
      if (!isValid) {
        const attempts = challenge.attempts + 1;
        await tx.otpChallenge.update({
          where: { id: otpChallengeId },
          data: { attempts, status: attempts >= challenge.maxAttempts ? "LOCKED" : "PENDING" },
        });
        throw new BadRequestException("Invalid OTP code");
      }

      await tx.otpChallenge.update({
        where: { id: otpChallengeId },
        data: { status: "VERIFIED", verifiedAt: new Date() },
      });

      const tripEmployeeStatus = challenge.purpose === "PICKUP" ? "PICKUP_VERIFIED" : "DROP_VERIFIED";
      await tx.tripEmployee.update({
        where: { id: challenge.tripEmployeeId },
        data: {
          status: tripEmployeeStatus,
          pickupVerifiedAt: challenge.purpose === "PICKUP" ? new Date() : undefined,
          dropVerifiedAt: challenge.purpose === "DROP" ? new Date() : undefined,
        },
      });

      await tx.tripEvent.create({
        data: {
          tripId: challenge.tripId,
          type: `OTP_${challenge.purpose}_VERIFIED`,
          location: location as never,
          metadata: { tripEmployeeId: challenge.tripEmployeeId, otpChallengeId },
        },
      });

      return { verified: true, tripEmployeeId: challenge.tripEmployeeId, purpose: challenge.purpose };
    });
  }

  async override(actor: AuthenticatedUser, otpChallengeId: string, reason: string) {
    if (actor.role !== "SUPERVISOR_DISPATCHER" && actor.role !== "KRUZE_SUPER_ADMIN") {
      throw new ForbiddenException("Only a supervisor may override OTP verification");
    }

    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.otpChallenge.findUnique({ where: { id: otpChallengeId }, include: { trip: true } });
      if (!challenge) {
        throw new NotFoundException("OTP challenge not found");
      }
      if (
        actor.role !== "KRUZE_SUPER_ADMIN" &&
        challenge.trip.corporateOrgId !== actor.organisationId &&
        challenge.trip.vendorOrgId !== actor.organisationId
      ) {
        throw new ForbiddenException("Not a party to this trip");
      }

      await tx.otpChallenge.update({
        where: { id: otpChallengeId },
        data: {
          status: "OVERRIDDEN",
          verifiedByUserId: actor.userId,
          overrideReason: reason,
          verifiedAt: new Date(),
        },
      });

      const tripEmployeeStatus = challenge.purpose === "PICKUP" ? "OVERRIDDEN" : "OVERRIDDEN";
      await tx.tripEmployee.update({ where: { id: challenge.tripEmployeeId }, data: { status: tripEmployeeStatus } });

      await tx.tripEvent.create({
        data: {
          tripId: challenge.tripId,
          type: `OTP_${challenge.purpose}_OVERRIDDEN`,
          actorUserId: actor.userId,
          metadata: { tripEmployeeId: challenge.tripEmployeeId, otpChallengeId, reason },
        },
      });

      return { overridden: true };
    });
  }
}
