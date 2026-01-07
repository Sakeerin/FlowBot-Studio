import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ChannelAdapter } from './channel-adapter.interface';
import { ChannelWebhookPayload } from '@shared/schemas/channel';

@Injectable()
export class LineChannelAdapter implements ChannelAdapter {
  verifySignature(body: string, signature: string, secret: string): boolean {
    if (!signature) {
      return false;
    }

    try {
      const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64');

      return hash === signature;
    } catch (error) {
      return false;
    }
  }

  parseWebhook(body: any, config: any): ChannelWebhookPayload {
    // LINE webhook format
    const events = body.events || [];
    if (events.length === 0) {
      throw new BadRequestException('No events in LINE webhook');
    }

    const event = events[0];
    if (event.type !== 'message' || event.message.type !== 'text') {
      throw new BadRequestException('Only text messages are supported');
    }

    return {
      channel: 'line',
      externalUserId: event.source.userId || event.source.groupId || event.source.roomId,
      messageId: event.message.id,
      text: event.message.text,
      type: 'text',
      timestamp: new Date(event.timestamp).toISOString(),
      metadata: {
        replyToken: event.replyToken,
        messageType: event.message.type,
        sourceType: event.source.type,
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
    const accessToken = config.channelAccessToken;
    if (!accessToken) {
      throw new BadRequestException('LINE channelAccessToken not configured');
    }

    // LINE Messaging API endpoint
    const url = 'https://api.line.me/v2/bot/message/push';

    const payload = {
      to: externalUserId,
      messages: [
        {
          type: 'text',
          text: message.content,
        },
      ],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LINE API error: ${error}`);
      }

      return await response.json();
    } catch (error) {
      throw new BadRequestException(`Failed to send LINE message: ${error.message}`);
    }
  }
}

