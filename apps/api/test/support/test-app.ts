import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { OrganisationRole, OrganisationStatus } from "@kruze/domain";

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix("v1");
  await app.init();

  const prisma = moduleRef.get(PrismaService);
  return { app, prisma };
}

let sequence = 0;

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Creates an ACTIVE organisation + an ACTIVE user membership, bypassing HTTP onboarding for fast test setup. */
export async function seedOrganisationWithUser(
  prisma: PrismaService,
  options: { role: OrganisationRole; membershipRole: string; email?: string; password?: string },
) {
  sequence += 1;
  const password = options.password ?? "password123!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const organisation = await prisma.organisation.create({
    data: {
      globalOrgId: `KZ-TST-${uniqueSuffix()}`,
      legalName: `Test Org ${sequence}`,
      displayName: `Test Org ${sequence}`,
      roles: [options.role],
      status: OrganisationStatus.ACTIVE,
    },
  });

  const email = options.email ?? `user-${uniqueSuffix()}@example.com`;
  const user = await prisma.user.create({
    data: { email, displayName: `User ${sequence}`, passwordHash },
  });

  const membership = await prisma.organisationMembership.create({
    data: {
      userId: user.id,
      organisationId: organisation.id,
      role: options.membershipRole as never,
      status: "ACTIVE",
    },
  });

  return { organisation, user, membership, email, password };
}
