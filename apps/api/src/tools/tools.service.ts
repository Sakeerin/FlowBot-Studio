import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { ToolExecutorService } from './tool-executor.service';
import { EncryptionService } from './encryption.service';
import { CreateTool, ToolDto } from '@shared/schemas/tool';
import { httpToolConfigSchema } from '@shared/schemas/tool';

@Injectable()
export class ToolsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private toolExecutor: ToolExecutorService,
    private encryption: EncryptionService
  ) {}

  async create(tenantId: string, userId: string, dto: CreateTool) {
    // Validate tool config based on type
    this.validateToolConfig(dto.type, dto.config);

    // Create tool
    const tool = await this.prisma.tool.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        config: dto.config as any,
        isActive: true,
      },
    });

    // Store secrets encrypted
    if (dto.secrets && Object.keys(dto.secrets).length > 0) {
      for (const [key, value] of Object.entries(dto.secrets)) {
        const encryptedValue = this.encryption.encrypt(value);
        await this.prisma.toolSecret.create({
          data: {
            toolId: tool.id,
            key,
            value: encryptedValue,
          },
        });
      }
    }

    await this.auditLogService.record(tenantId, userId, 'tool.create', 'Tool', tool.id, {
      name: dto.name,
      type: dto.type,
    });

    return this.toDto(tool);
  }

  async findAll(tenantId: string) {
    const tools = await this.prisma.tool.findMany({
      where: { tenantId },
      include: {
        secrets: {
          select: {
            key: true,
            // Don't expose encrypted values
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tools.map((t) => this.toDto(t));
  }

  async findOne(tenantId: string, toolId: string) {
    const tool = await this.prisma.tool.findFirst({
      where: {
        id: toolId,
        tenantId, // Enforce tenant isolation
      },
      include: {
        secrets: {
          select: {
            key: true,
            // Don't expose encrypted values
          },
        },
      },
    });

    if (!tool) {
      throw new NotFoundException('Tool not found');
    }

    return this.toDto(tool);
  }

  async update(tenantId: string, userId: string, toolId: string, dto: Partial<CreateTool>) {
    const tool = await this.findOne(tenantId, toolId);

    // Validate config if provided
    if (dto.config) {
      this.validateToolConfig(dto.type || tool.type, dto.config);
    }

    // Update tool
    const updated = await this.prisma.tool.update({
      where: { id: toolId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.config && { config: dto.config as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    // Update secrets if provided
    if (dto.secrets !== undefined) {
      // Delete existing secrets
      await this.prisma.toolSecret.deleteMany({
        where: { toolId },
      });

      // Create new secrets
      if (Object.keys(dto.secrets).length > 0) {
        for (const [key, value] of Object.entries(dto.secrets)) {
          const encryptedValue = this.encryption.encrypt(value);
          await this.prisma.toolSecret.create({
            data: {
              toolId,
              key,
              value: encryptedValue,
            },
          });
        }
      }
    }

    await this.auditLogService.record(tenantId, userId, 'tool.update', 'Tool', toolId, {
      changes: dto,
    });

    return this.toDto(updated);
  }

  async delete(tenantId: string, userId: string, toolId: string) {
    const tool = await this.findOne(tenantId, toolId);

    await this.prisma.tool.delete({
      where: { id: toolId },
    });

    await this.auditLogService.record(tenantId, userId, 'tool.delete', 'Tool', toolId, {
      name: tool.name,
    });

    return { success: true };
  }

  async execute(tenantId: string, toolId: string, input: Record<string, any>): Promise<any> {
    const tool = await this.findOne(tenantId, toolId);

    if (!tool.isActive) {
      throw new BadRequestException('Tool is not active');
    }

    // Load secrets for tool execution
    const secrets = await this.prisma.toolSecret.findMany({
      where: { toolId },
    });

    const decryptedSecrets: Record<string, string> = {};
    for (const secret of secrets) {
      decryptedSecrets[secret.key] = this.encryption.decrypt(secret.value);
    }

    // Execute tool
    return this.toolExecutor.execute(tool, input, decryptedSecrets);
  }

  async validateToolPermission(tenantId: string, botId: string, toolId: string): Promise<boolean> {
    // Load bot's allowed tools
    const bot = await this.prisma.bot.findFirst({
      where: {
        id: botId,
        tenantId,
      },
      select: {
        settings: true,
      },
    });

    if (!bot) {
      return false;
    }

    const settings = bot.settings as any;
    const allowedToolIds = settings?.allowedToolIds || [];

    // If no restrictions, allow all tools
    if (allowedToolIds.length === 0) {
      return true;
    }

    return allowedToolIds.includes(toolId);
  }

  private validateToolConfig(type: string, config: any): void {
    switch (type) {
      case 'http':
        httpToolConfigSchema.parse(config);
        break;
      case 'function':
        // Function tools validation will be added later
        break;
      default:
        throw new BadRequestException(`Unknown tool type: ${type}`);
    }
  }

  private toDto(tool: any): ToolDto {
    return {
      id: tool.id,
      tenantId: tool.tenantId,
      name: tool.name,
      type: tool.type,
      config: tool.config,
      isActive: tool.isActive,
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
      secrets: tool.secrets ? Object.fromEntries(tool.secrets.map((s: any) => [s.key, '***'])) : {},
    };
  }
}
