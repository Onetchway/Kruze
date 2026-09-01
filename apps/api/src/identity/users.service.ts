import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createWithPassword(input: { email: string; password: string; displayName: string }) {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    return this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash,
      },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async verifyPassword(passwordHash: string, candidate: string): Promise<boolean> {
    return argon2.verify(passwordHash, candidate);
  }
}
