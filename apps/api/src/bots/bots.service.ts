import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBot, UpdateBot, PublishBotRequest } from '@shared/schemas/bot';
import { FlowGraphDto } from '@shared/schemas/flow';
import { Role, BotVersionStatus } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';
import { FlowGraphValidator } from './flow-graph.validator';

@Injectable()
export class BotsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private flowGraphValidator: FlowGraphValidator
  ) {}

  async create(tenantId: string, userId: string, dto: CreateBot) {
    const bot = await this.prisma.bot.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        settings: dto.settings || {},
      },
    });

    // Create initial draft flow graph
    await this.prisma.flowGraph.create({
      data: {
        botId: bot.id,
        isDraft: true,
        nodes: [],
        edges: [],
        variables: {},
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'bot.create',
      'Bot',
      bot.id,
      { name: dto.name }
    );

    return bot;
  }

  async findAll(tenantId: string, userId: string, userRoles: Role[]) {
    // Enforce tenant isolation
    const bots = await this.prisma.bot.findMany({
      where: { tenantId },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { version: 'desc' },
          take: 1,
        },
        flowGraphs: {
          where: { isDraft: true },
          take: 1,
        },
      },
    });

    return bots;
  }

  async findOne(tenantId: string, botId: string, userRoles: Role[]) {
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        tenantId, // Enforce tenant isolation
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        flowGraphs: {
          where: { isDraft: true },
          take: 1,
        },
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    return bot;
  }

  async update(
    tenantId: string,
    botId: string,
    userId: string,
    dto: UpdateBot
  ) {
    // Check bot exists and belongs to tenant
    const bot = await this.findOne(tenantId, botId, []);

    const updated = await this.prisma.bot.update({
      where: { id: botId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.settings && { settings: dto.settings }),
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'bot.update',
      'Bot',
      botId,
      { changes: dto }
    );

    return updated;
  }

  async delete(tenantId: string, botId: string, userId: string) {
    // Check bot exists and belongs to tenant
    await this.findOne(tenantId, botId, []);

    await this.prisma.bot.delete({
      where: { id: botId },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'bot.delete',
      'Bot',
      botId,
      {}
    );
  }

  async getDraftFlow(tenantId: string, botId: string) {
    // Verify bot belongs to tenant
    await this.findOne(tenantId, botId, []);

    const flowGraph = await this.prisma.flowGraph.findFirst({
      where: {
        botId,
        isDraft: true,
      },
    });

    if (!flowGraph) {
      throw new NotFoundException('Draft flow graph not found');
    }

    return flowGraph;
  }

  async saveDraftFlow(
    tenantId: string,
    botId: string,
    userId: string,
    flowGraph: FlowGraphDto
  ) {
    // Verify bot belongs to tenant
    await this.findOne(tenantId, botId, []);

    // Validate flow graph
    const validationErrors = this.flowGraphValidator.validate(flowGraph);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Flow graph validation failed',
        errors: validationErrors,
      });
    }

    const updated = await this.prisma.flowGraph.upsert({
      where: {
        botId_isDraft: {
          botId,
          isDraft: true,
        },
      },
      update: {
        nodes: flowGraph.nodes as any,
        edges: flowGraph.edges as any,
        variables: flowGraph.variables || {},
      },
      create: {
        botId,
        isDraft: true,
        nodes: flowGraph.nodes as any,
        edges: flowGraph.edges as any,
        variables: flowGraph.variables || {},
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'bot.draft.save',
      'Bot',
      botId,
      { nodeCount: flowGraph.nodes?.length || 0 }
    );

    return updated;
  }

  async publish(
    tenantId: string,
    botId: string,
    userId: string,
    dto: PublishBotRequest
  ) {
    // Verify bot belongs to tenant
    await this.findOne(tenantId, botId, []);

    // Get draft flow graph
    const draftFlow = await this.getDraftFlow(tenantId, botId);

    // Validate flow graph
    const flowGraphDto: FlowGraphDto = {
      nodes: draftFlow.nodes as any,
      edges: draftFlow.edges as any,
      variables: draftFlow.variables as any,
    };

    const validationErrors = this.flowGraphValidator.validate(flowGraphDto);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Cannot publish: flow graph validation failed',
        errors: validationErrors,
      });
    }

    // Atomic transaction: create version and snapshot
    return await this.prisma.$transaction(async (tx) => {
      // Get next version number
      const latestVersion = await tx.botVersion.findFirst({
        where: { botId },
        orderBy: { version: 'desc' },
      });

      const nextVersion = (latestVersion?.version || 0) + 1;

      // Create published version
      const botVersion = await tx.botVersion.create({
        data: {
          botId,
          version: nextVersion,
          status: BotVersionStatus.PUBLISHED,
          flowGraph: {
            nodes: draftFlow.nodes,
            edges: draftFlow.edges,
            variables: draftFlow.variables,
          },
          config: {},
        },
      });

      // Record audit log
      await this.auditLogService.record(
        tenantId,
        userId,
        'bot.publish',
        'BotVersion',
        botVersion.id,
        {
          botId,
          version: nextVersion,
          channelIds: dto.channelIds,
        }
      );

      return botVersion;
    });
  }

  async rollback(
    tenantId: string,
    botId: string,
    version: number,
    userId: string
  ) {
    // Verify bot belongs to tenant
    await this.findOne(tenantId, botId, []);

    // Find the version to rollback to
    const targetVersion = await this.prisma.botVersion.findFirst({
      where: {
        botId,
        version,
        status: BotVersionStatus.PUBLISHED,
      },
    });

    if (!targetVersion) {
      throw new NotFoundException(
        `Published version ${version} not found for this bot`
      );
    }

    // Atomic transaction: update draft to match the version
    return await this.prisma.$transaction(async (tx) => {
      // Update draft flow graph to match the rolled-back version
      await tx.flowGraph.updateMany({
        where: {
          botId,
          isDraft: true,
        },
        data: {
          nodes: (targetVersion.flowGraph as any).nodes,
          edges: (targetVersion.flowGraph as any).edges,
          variables: (targetVersion.flowGraph as any).variables || {},
        },
      });

      // Record audit log
      await this.auditLogService.record(
        tenantId,
        userId,
        'bot.rollback',
        'BotVersion',
        targetVersion.id,
        {
          botId,
          version,
        }
      );

      return {
        message: `Rolled back to version ${version}`,
        version: targetVersion,
      };
    });
  }
}
