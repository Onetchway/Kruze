import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get("recipients/:recipientId")
  listForRecipient(@Param("recipientId") recipientId: string) {
    return this.notifications.listForRecipient(recipientId);
  }
}
