import { ChannelWebhookPayload } from '@shared/schemas/channel';

export interface ChannelAdapter {
  /**
   * Verify the webhook signature from the channel
   */
  verifySignature(body: any, signature: string, secret: string): boolean;

  /**
   * Parse the webhook payload into a standard format
   */
  parseWebhook(body: any, config: any): ChannelWebhookPayload;

  /**
   * Send a message through the channel
   */
  sendMessage(
    externalUserId: string,
    message: {
      type: string;
      content: string;
      metadata?: any;
    },
    config: any
  ): Promise<any>;
}

