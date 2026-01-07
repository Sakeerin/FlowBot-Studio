import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannelsService } from '../channels.service';
import { ChannelAdapterFactory } from '../adapters/channel-adapter.factory';
import { RuntimeService } from '../../runtime/runtime.service';
import { ChannelWebhookPayload } from '@shared/schemas/channel';

@Injectable()
export class ChannelWebhookService {
  constructor(
    private prisma: PrismaService,
    private channelsService: ChannelsService,
    private adapterFactory: ChannelAdapterFactory,
    private runtimeService: RuntimeService
  ) {}

  async processWebhook(
    channel: string,
    body: any,
    headers: Record<string, string>,
    rawBody?: Buffer
  ): Promise<{ sessionId: string; messages: any[] }> {
    // Find the channel connection
    // For now, we'll find the first active connection for this channel
    // In production, you might want to route by domain or other identifier
    const connections = await this.prisma.channelConnection.findMany({
      where: {
        channel,
        isActive: true,
      },
      include: {
        bot: true,
      },
    });

    if (connections.length === 0) {
      throw new NotFoundException(`No active connection found for channel: ${channel}`);
    }

    // Use the first connection (in production, implement routing logic)
    const connection = connections[0];

    // Get the adapter for this channel
    const adapter = this.adapterFactory.getAdapter(channel);

    // Verify signature
    const signature = headers['x-line-signature'] || headers['x-hub-signature'] || headers['authorization'] || '';
    const secret = (connection.config as any).channelSecret || 
                   (connection.config as any).appSecret || 
                   (connection.config as any).webhookSecret || 
                   '';

    if (secret && rawBody) {
      const isValid = adapter.verifySignature(
        rawBody.toString('utf8'),
        signature,
        secret
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Parse webhook payload
    let payload: ChannelWebhookPayload;
    try {
      payload = adapter.parseWebhook(body, connection.config);
    } catch (error) {
      throw new BadRequestException(`Failed to parse webhook: ${error.message}`);
    }

    // Resolve tenant and bot
    const tenantId = connection.tenantId;
    const botId = connection.botId;

    if (!botId) {
      throw new BadRequestException('Channel connection has no bot assigned');
    }

    // Process through runtime
    const runtimePayload = {
      messageId: payload.messageId,
      userId: payload.externalUserId,
      channel: channel as any,
      text: payload.text,
      type: (payload.type || 'text') as any,
      timestamp: payload.timestamp,
      metadata: {
        ...payload.metadata,
        channel,
        externalUserId: payload.externalUserId,
      },
    };

    const result = await this.runtimeService.processInbound(
      channel,
      runtimePayload
    );

    // Send outgoing messages through the channel adapter
    if (result.messages && result.messages.length > 0) {
      for (const message of result.messages) {
        try {
          await adapter.sendMessage(
            payload.externalUserId,
            {
              type: message.type || 'text',
              content: message.content,
              metadata: message.metadata,
            },
            connection.config
          );
        } catch (error) {
          console.error(`Failed to send message through ${channel}:`, error);
          // Continue processing other messages
        }
      }
    }

    return {
      sessionId: result.sessionId,
      messages: result.messages || [],
    };
  }
}

