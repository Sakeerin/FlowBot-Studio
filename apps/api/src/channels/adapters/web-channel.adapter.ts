import { Injectable } from '@nestjs/common';
import { ChannelAdapter } from './channel-adapter.interface';
import { ChannelWebhookPayload } from '@shared/schemas/channel';

@Injectable()
export class WebChannelAdapter implements ChannelAdapter {
  verifySignature(body: any, signature: string, secret: string): boolean {
    // Web channel uses simple API key verification
    // In production, use HMAC or JWT-based verification
    return signature === secret;
  }

  parseWebhook(body: any, config: any): ChannelWebhookPayload {
    return {
      channel: 'web',
      externalUserId: body.userId || body.externalUserId,
      messageId: body.messageId || `web-${Date.now()}-${Math.random()}`,
      text: body.text || body.message,
      type: body.type || 'text',
      timestamp: body.timestamp || new Date().toISOString(),
      metadata: {
        ...body.metadata,
        userAgent: body.userAgent,
        ip: body.ip,
      },
    };
  }

  async sendMessage(
    externalUserId: string,
    message: {
      type: string;
      content: string;
      metadata?: any;
    },
    config: any
  ): Promise<any> {
    // Web channel messages are returned directly to the HTTP response
    // No async sending needed
    return {
      userId: externalUserId,
      message: {
        type: message.type,
        content: message.content,
        metadata: message.metadata,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

