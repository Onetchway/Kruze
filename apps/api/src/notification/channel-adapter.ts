export interface ChannelDeliveryResult {
  delivered: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface NotificationChannelAdapter {
  send(input: { recipientId?: string; templateKey: string; payload?: unknown }): Promise<ChannelDeliveryResult>;
}

/**
 * Default adapter for every channel until a real provider (FCM/APNs, an
 * SMS gateway, SES, WhatsApp Business API) is wired in. Keeping the
 * interface stable now means swapping providers later never touches
 * NotificationService's calling code.
 */
export class LoggingChannelAdapter implements NotificationChannelAdapter {
  async send(): Promise<ChannelDeliveryResult> {
    return { delivered: true };
  }
}
