import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { LoggingChannelAdapter, NotificationChannelAdapter } from "./channel-adapter";
import { NotificationChannel } from "../../generated/prisma";

/**
 * Single entry point for every outbound notification (trip assignment,
 * vehicle approaching, OTP, delay/cancellation, SOS, compliance/contract
 * expiry, ...). Callers describe *what* happened (`event`) and *who*
 * should hear about it; channel selection/adapter wiring lives here.
 */
@Injectable()
export class NotificationService {
  private readonly adapters: Record<NotificationChannel, NotificationChannelAdapter> = {
    PUSH: new LoggingChannelAdapter(),
    SMS: new LoggingChannelAdapter(),
    EMAIL: new LoggingChannelAdapter(),
    WHATSAPP: new LoggingChannelAdapter(),
  };

  constructor(private readonly prisma: PrismaService) {}

  async send(input: {
    event: string;
    channel: NotificationChannel;
    templateKey: string;
    recipientType: string;
    recipientId?: string;
    recipientUserId?: string;
    payload?: unknown;
    tripId?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        event: input.event,
        channel: input.channel,
        templateKey: input.templateKey,
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        recipientUserId: input.recipientUserId,
        payload: input.payload as never,
        tripId: input.tripId,
        status: "QUEUED",
      },
    });

    const result = await this.adapters[input.channel].send({
      recipientId: input.recipientId,
      templateKey: input.templateKey,
      payload: input.payload,
    });

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: result.delivered ? "SENT" : "FAILED",
        sentAt: result.delivered ? new Date() : undefined,
      },
    });
  }

  listForRecipient(recipientId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
