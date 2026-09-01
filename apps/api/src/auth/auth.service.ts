import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OrganisationRole, PlatformRole } from "@kruze/domain";
import { UsersService } from "../identity/users.service";
import { PrismaService } from "../common/prisma/prisma.service";
import { OrganisationService } from "../organisation/organisation.service";
import { JwtPayload } from "./jwt-payload";

/** The admin role granted to the user who self-registers a new organisation. */
const PRIMARY_ROLE_TO_ADMIN_MEMBERSHIP: Record<OrganisationRole, PlatformRole> = {
  [OrganisationRole.KRUZE_PLATFORM]: PlatformRole.KRUZE_SUPER_ADMIN,
  [OrganisationRole.CORPORATE]: PlatformRole.CORPORATE_TRANSPORT_ADMIN,
  [OrganisationRole.FLEET_OPERATOR]: PlatformRole.FLEET_OPERATOR_ADMIN,
  [OrganisationRole.VENDOR]: PlatformRole.VENDOR_ADMIN,
  [OrganisationRole.SUB_VENDOR]: PlatformRole.VENDOR_ADMIN,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly organisations: OrganisationService,
  ) {}

  /**
   * Self-service signup: creates the user, an ACTIVE organisation (a
   * corporate subscribing directly to Kruze does not need operator
   * mediation — spec §1), and an admin membership, then returns a session
   * exactly like login. Kruze-platform-role signup is not exposed here;
   * that account is provisioned out of band.
   */
  async register(input: {
    email: string;
    password: string;
    displayName: string;
    organisationLegalName: string;
    organisationDisplayName: string;
    organisationRole: OrganisationRole;
  }) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const user = await this.users.createWithPassword({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });

    const organisation = await this.organisations.requestOnboarding({
      legalName: input.organisationLegalName,
      displayName: input.organisationDisplayName,
      roles: [input.organisationRole],
    });
    await this.organisations.approve(organisation.id);

    const membership = await this.prisma.organisationMembership.create({
      data: {
        userId: user.id,
        organisationId: organisation.id,
        role: PRIMARY_ROLE_TO_ADMIN_MEMBERSHIP[input.organisationRole],
        status: "ACTIVE",
      },
    });

    return this.issueTokenForMembership(user.id, membership.id, organisation.id, membership.role);
  }

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
