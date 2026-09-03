import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateApiKeyDto } from "./dto/api-key.dto";

const SAFE_SELECT = {
  id: true,
  name: true,
  organisationId: true,
  scopes: true,
  createdByUserId: true,
  keyPrefix: true,
  status: true,
  expiresAt: true,
  lastUsedAt: true,
  createdAt: true,
  revokedAt: true,
  organisation: { select: { id: true, globalOrgId: true, displayName: true } },
} as const;

/**
 * Minimal API key CRUD (spec §51 bare slice) — no OAuth apps, no webhook
 * delivery, no rate limiting, no API versioning. The plaintext secret is
 * generated, hashed with argon2 (same primitive as user password hashing
 * — see UsersService), and returned exactly once at creation; every other
 * read only ever returns `keyPrefix` and metadata.
 */
@Injectable()
export class PlatformApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { organisationId?: string } = {}) {
    return this.prisma.apiKey.findMany({
      where: params.organisationId ? { organisationId: params.organisationId } : {},
      orderBy: { createdAt: "desc" },
      select: SAFE_SELECT,
    });
  }

  async create(dto: CreateApiKeyDto, actorUserId?: string) {
    const secret = `kz_${randomBytes(24).toString("base64url")}`;
    const secretHash = await argon2.hash(secret, { type: argon2.argon2id });
    const keyPrefix = secret.slice(0, 12);
    const created = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        organisationId: dto.organisationId,
        scopes: dto.scopes ?? [],
        createdByUserId: actorUserId,
        secretHash,
        keyPrefix,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      select: SAFE_SELECT,
    });
    // The only point in this key's lifetime the plaintext secret is ever available.
    return { ...created, secret };
  }

  async revoke(id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException("API key not found");
    return this.prisma.apiKey.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date() },
      select: SAFE_SELECT,
    });
  }
}
