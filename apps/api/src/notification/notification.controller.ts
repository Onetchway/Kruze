import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../common/request-context";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get("recipients/:recipientId")
  listForRecipient(@CurrentUser() user: AuthenticatedUser, @Param("recipientId") recipientId: string) {
    return this.notifications.listForRecipient(user, recipientId);
  }
}
