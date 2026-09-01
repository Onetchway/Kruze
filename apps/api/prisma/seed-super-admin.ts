/**
 * One-time bootstrap for the first Kruze platform (KRUZE_SUPER_ADMIN)
 * account. `/auth/register` deliberately refuses to create
 * KRUZE_PLATFORM organisations (a self-registration endpoint must never
 * be able to mint a super-admin) — this script is the out-of-band path
 * instead. Run once per environment:
 *
 *   SUPER_ADMIN_EMAIL=ops@kruze.internal \
 *   SUPER_ADMIN_PASSWORD='...' \
 *   SUPER_ADMIN_NAME='Kruze Ops' \
 *   pnpm --filter @kruze/api seed:super-admin
 *
 * Idempotent: does nothing if that email already has an account.
 */
import * as argon2 from "argon2";
import { PrismaClient } from "../generated/prisma";
import { OrganisationRole, OrganisationStatus, PlatformRole } from "@kruze/domain";
import { formatGlobalOrgId } from "../src/organisation/global-id.util";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const displayName = process.env.SUPER_ADMIN_NAME ?? "Kruze Platform Admin";

  if (!email || !password) {
    throw new Error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD before running this script");
  }
  if (password.length < 8) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`A user with email ${email} already exists — nothing to do.`);
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, displayName, passwordHash } });

    const sequence = (await tx.organisation.count({ where: { roles: { has: OrganisationRole.KRUZE_PLATFORM } } })) + 1;
    const organisation = await tx.organisation.create({
      data: {
        globalOrgId: formatGlobalOrgId(OrganisationRole.KRUZE_PLATFORM, sequence),
        legalName: "Kruze Platform",
        displayName: "Kruze Platform",
        roles: [OrganisationRole.KRUZE_PLATFORM],
        status: OrganisationStatus.ACTIVE,
      },
    });

    await tx.organisationMembership.create({
      data: {
        userId: user.id,
        organisationId: organisation.id,
        role: PlatformRole.KRUZE_SUPER_ADMIN,
        status: "ACTIVE",
      },
    });

    return organisation;
  });

  console.log(`Created Kruze super-admin ${email} under organisation ${result.globalOrgId}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
