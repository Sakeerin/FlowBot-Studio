import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotsService } from '../bots/bots.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ToolsService } from '../tools/tools.service';
import { PackManifest, InstallPackRequest } from '@shared/schemas/pack';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PacksService {
  private readonly logger = new Logger(PacksService.name);
  private packs: Map<string, PackManifest> = new Map();

  constructor(
    private prisma: PrismaService,
    private botsService: BotsService,
    private knowledgeService: KnowledgeService,
    private toolsService: ToolsService
  ) {
    // Load built-in packs from JSON files
    const packsDir = path.join(__dirname, '../../packs');
    const packFiles = ['hotel.json', 'restaurant.json', 'insurance.json'];

    for (const packFile of packFiles) {
      try {
        const packPath = path.join(packsDir, packFile);
        const packContent = fs.readFileSync(packPath, 'utf-8');
        const pack: PackManifest = JSON.parse(packContent);
        this.packs.set(pack.id, pack);
      } catch (error) {
        this.logger.error(`Failed to load pack ${packFile}:`, error);
      }
    }
  }

  async findAll() {
    return Array.from(this.packs.values()).map((pack) => ({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      version: pack.version,
      industry: pack.industry,
      icon: pack.icon,
    }));
  }

  async findOne(packId: string) {
    const pack = this.packs.get(packId);
    if (!pack) {
      throw new NotFoundException(`Pack not found: ${packId}`);
    }
    return pack;
  }

  async install(tenantId: string, userId: string, dto: InstallPackRequest) {
    const pack = await this.findOne(dto.packId);

    // Create bot from pack
    const botName = dto.botName || pack.bot.name;
    const bot = await this.botsService.create(tenantId, userId, {
      name: botName,
      description: pack.bot.description || pack.description,
      settings: pack.bot.settings || {},
    });

    await this.botsService.saveDraftFlow(tenantId, bot.id, userId, pack.flowGraph);

    // Install tools if any
    const toolIds: string[] = [];
    if (pack.tools && pack.tools.length > 0) {
      for (const toolTemplate of pack.tools) {
        const tool = await this.toolsService.create(tenantId, userId, {
          name: toolTemplate.name,
          description: toolTemplate.description,
          config: {
            method: toolTemplate.config.method,
            url: toolTemplate.config.url,
            headers: toolTemplate.config.headers || {},
            auth: toolTemplate.config.auth
              ? {
                  type: toolTemplate.config.auth.type,
                  key: toolTemplate.config.auth.key,
                  value: dto.toolSecrets?.[toolTemplate.name] || toolTemplate.config.auth.value,
                }
              : undefined,
            bodyTemplate: toolTemplate.config.bodyTemplate,
            timeout: toolTemplate.config.timeout || 5000,
            retries: toolTemplate.config.retries || 3,
          },
          secrets: dto.toolSecrets
            ? Object.fromEntries(
                Object.entries(dto.toolSecrets).filter(
                  ([k]) => toolTemplate.secrets?.[k] !== undefined
                )
              )
            : toolTemplate.secrets || {},
        });

        toolIds.push(tool.id);
      }

      if (toolIds.length > 0) {
        await this.botsService.update(tenantId, bot.id, userId, {
          settings: {
            ...bot.settings,
            allowedToolIds: toolIds,
          },
        });
      }
    }

    // Install knowledge base collections if any
    if (pack.knowledge?.collections && pack.knowledge.collections.length > 0) {
      for (const collectionTemplate of pack.knowledge.collections) {
        const collection = await this.knowledgeService.createCollection(tenantId, userId, {
          name: collectionTemplate.name,
          description: collectionTemplate.description,
          botId: bot.id,
        });

        // Ingest sources
        for (const sourceTemplate of collectionTemplate.sources) {
          if (sourceTemplate.type === 'qa') {
            await this.knowledgeService.addSource(tenantId, userId, collection.id, {
              collectionId: collection.id,
              type: 'qa',
              content: {
                pairs: [
                  {
                    question: sourceTemplate.content,
                    answer: (sourceTemplate.metadata as any)?.answer || '',
                  },
                ],
              },
              metadata: sourceTemplate.metadata,
            });
          } else if (sourceTemplate.type === 'text') {
            await this.knowledgeService.addSource(tenantId, userId, collection.id, {
              collectionId: collection.id,
              type: 'text',
              content: {
                text: sourceTemplate.content,
              },
              metadata: sourceTemplate.metadata,
            });
          }
          // File type would require file upload, skip for MVP
        }
      }
    }

    return {
      bot,
      pack: {
        id: pack.id,
        name: pack.name,
        version: pack.version,
      },
    };
  }

  async installNewVersion(tenantId: string, userId: string, packId: string, botName?: string) {
    const pack = await this.findOne(packId);
    return this.install(tenantId, userId, {
      packId,
      botName: botName || `${pack.name} (v${pack.version})`,
    });
  }
}
