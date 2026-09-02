import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { UsersService } from "../identity/users.service";
import { AuthenticatedUser } from "../common/request-context";
import { INVITABLE_CORPORATE_ROLES } from "./dto/invite-corporate-user.dto";
import { PlatformRole } from "../../generated/prisma";

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

@Injectable()
export class CorporateUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  listMembers(organisationId: string) {
    return this.prisma.organisationMembership.findMany({
      where: { organisationId },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * No email delivery is configured in this environment, so this creates
   * the account directly and returns a one-time temporary password for the
   * admin to share out of band — a pragmatic stand-in for a real invite
   * email, not a security shortcut (the temp password is never logged or
   * stored in the clear).
   */
  async invite(actor: AuthenticatedUser, input: { email: string; displayName: string; role: PlatformRole }) {
    if (!INVITABLE_CORPORATE_ROLES.includes(input.role)) {
      throw new BadRequestException(`Role ${input.role} cannot be granted from Corporate Settings`);
    }
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      const existingMembership = await this.prisma.organisationMembership.findFirst({
        where: { userId: existing.id, organisationId: actor.organisationId },
      });
      if (existingMembership) {
        throw new ConflictException("This person is already a member of your organisation");
      }
    }

    const tempPassword = generateTempPassword();
    const user = existing ?? (await this.users.createWithPassword({ email: input.email, displayName: input.displayName, password: tempPassword }));

    const membership = await this.prisma.organisationMembership.create({
      data: {
        userId: user.id,
        organisationId: actor.organisationId,
        role: input.role,
        status: "ACTIVE",
      },
    });

    return { membership, temporaryPassword: existing ? null : tempPassword };
  }

  async setStatus(actor: AuthenticatedUser, membershipId: string, status: "ACTIVE" | "SUSPENDED") {
    const membership = await this.prisma.organisationMembership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.organisationId !== actor.organisationId) {
      throw new NotFoundException("Membership not found in your organisation");
    }
    if (membership.userId === actor.userId && status === "SUSPENDED") {
      throw new BadRequestException("Cannot suspend your own membership");
    }
    return this.prisma.organisationMembership.update({ where: { id: membershipId }, data: { status } });
  }
}
