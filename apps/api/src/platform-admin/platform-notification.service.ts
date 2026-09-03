import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from "./dto/notification-template.dto";

/**
 * Notification-template catalogue (spec §53) — the definitions a Super
 * Admin authors ("Driver assigned", "Trip delayed", "OTP", ...), distinct
 * from the `Notification` model which records individual sent messages.
 * Not yet wired into the send pipeline (NotificationChannel dispatch still
 * keys off a bare templateKey string) — this pass makes the catalogue a
 * real, editable table with CRUD, not a claim that sending now resolves
 * through it.
 */
@Injectable()
export class PlatformNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { category?: string; active?: string } = {}) {
    const { category, active } = params;
    return this.prisma.notificationTemplate.findMany({
      where: {
        ...(category ? { category: category as never } : {}),
        ...(active !== undefined ? { active: active === "true" } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException("Notification template not found");
    return template;
  }

  create(dto: CreateNotificationTemplateDto) {
    return this.prisma.notificationTemplate.create({
      data: {
        name: dto.name,
        category: dto.category as never,
        channels: dto.channels,
        subject: dto.subject,
        body: dto.body,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateNotificationTemplateDto) {
    await this.get(id);
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category as never } : {}),
        ...(dto.channels !== undefined ? { channels: dto.channels } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async deactivate(id: string) {
    await this.get(id);
    return this.prisma.notificationTemplate.update({ where: { id }, data: { active: false } });
  }

  async activate(id: string) {
    await this.get(id);
    return this.prisma.notificationTemplate.update({ where: { id }, data: { active: true } });
  }
}
