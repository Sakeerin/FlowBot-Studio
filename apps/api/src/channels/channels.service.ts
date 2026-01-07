import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChannelConnection,
  UpdateChannelConnection,
} from '@shared/schemas/channel';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class ChannelsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateChannelConnection
  ) {
    // Validate channel-specific config
    this.validateChannelConfig(dto.channel, dto.config);

    const connection = await this.prisma.channelConnection.create({
      data: {
        tenantId,
        botId: dto.botId || null,
        channel: dto.channel,
        config: dto.config,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'channel.create',
      'ChannelConnection',
      connection.id,
      { channel: dto.channel }
    );

    return connection;
  }

  async findAll(tenantId: string, botId?: string) {
    return this.prisma.channelConnection.findMany({
      where: {
        tenantId,
        ...(botId && { botId }),
      },
      include: {
        bot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, connectionId: string) {
    const connection = await this.prisma.channelConnection.findFirst({
      where: {
        id: connectionId,
        tenantId, // Enforce tenant isolation
      },
      include: {
        bot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundException('Channel connection not found');
    }

    return connection;
  }

  async update(
    tenantId: string,
    userId: string,
    connectionId: string,
    dto: UpdateChannelConnection
  ) {
    const connection = await this.findOne(tenantId, connectionId);

    // Validate channel-specific config if provided
    if (dto.config) {
      this.validateChannelConfig(connection.channel, dto.config);
    }

    const updated = await this.prisma.channelConnection.update({
      where: { id: connectionId },
      data: {
        ...(dto.botId !== undefined && { botId: dto.botId || null }),
        ...(dto.config && { config: dto.config }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'channel.update',
      'ChannelConnection',
      connectionId,
      { changes: dto }
    );

    return updated;
  }

  async delete(tenantId: string, userId: string, connectionId: string) {
    const connection = await this.findOne(tenantId, connectionId);

    await this.prisma.channelConnection.delete({
      where: { id: connectionId },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'channel.delete',
      'ChannelConnection',
      connectionId,
      { channel: connection.channel }
    );

    return { success: true };
  }

  async findByChannelAndUser(
    tenantId: string,
    channel: string,
    externalUserId: string
  ) {
    const connection = await this.prisma.channelConnection.findFirst({
      where: {
        tenantId,
        channel,
        isActive: true,
      },
      include: {
        bot: true,
      },
    });

    if (!connection) {
      throw new NotFoundException(
        `Active connection not found for channel: ${channel}`
      );
    }

    return connection;
  }

  private validateChannelConfig(channel: string, config: any): void {
    switch (channel) {
      case 'line':
        if (!config.channelSecret || !config.channelAccessToken) {
          throw new BadRequestException(
            'LINE channel requires channelSecret and channelAccessToken'
          );
        }
        break;
      case 'facebook':
        if (!config.appSecret || !config.pageAccessToken) {
          throw new BadRequestException(
            'Facebook channel requires appSecret and pageAccessToken'
          );
        }
        break;
      case 'web':
        // Web channel doesn't require specific config
        break;
      default:
        // Other channels can have flexible config
        break;
    }
  }

  async getHealthStatus(tenantId: string, connectionId: string) {
    const connection = await this.findOne(tenantId, connectionId);

    // Basic health check - can be extended with actual channel API calls
    return {
      connectionId: connection.id,
      channel: connection.channel,
      isActive: connection.isActive,
      status: connection.isActive ? 'healthy' : 'inactive',
      lastChecked: new Date().toISOString(),
    };
  }
}

