import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../identity/users.service";
import { PrismaService } from "../common/prisma/prisma.service";
import { JwtPayload } from "./jwt-payload";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(input: { email: string; password: string; organisationId?: string }) {
    const user = await this.users.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const valid = await this.users.verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const memberships = await this.prisma.organisationMembership.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE",
        ...(input.organisationId ? { organisationId: input.organisationId } : {}),
      },
    });

    if (memberships.length === 0) {
      throw new UnauthorizedException("No active organisation membership");
    }

    if (memberships.length > 1) {
      // Caller must disambiguate by supplying organisationId.
      return {
        requiresOrganisationSelection: true,
        organisations: memberships.map((m) => ({
          organisationId: m.organisationId,
          role: m.role,
        })),
      } as const;
    }

    const membership = memberships[0];
    return this.issueTokenForMembership(user.id, membership.id, membership.organisationId, membership.role);
  }

  private issueTokenForMembership(
    userId: string,
    membershipId: string,
    organisationId: string,
    role: string,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      orgId: organisationId,
      membershipId,
      role,
    };
    return {
      accessToken: this.jwt.sign(payload),
      organisationId,
      role,
    };
  }
}
