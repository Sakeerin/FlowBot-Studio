import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeCollection, CreateKnowledgeSource } from '@shared/schemas/knowledge';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService
  ) {}

  async createCollection(tenantId: string, userId: string, dto: CreateKnowledgeCollection) {
    const collection = await this.prisma.knowledgeCollection.create({
      data: {
        tenantId,
        botId: dto.botId || null,
        name: dto.name,
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'kb.collection.create',
      'KnowledgeCollection',
      collection.id,
      { name: dto.name }
    );

    return collection;
  }

  async getCollections(tenantId: string, botId?: string) {
    return this.prisma.knowledgeCollection.findMany({
      where: {
        tenantId,
        ...(botId && { botId }),
      },
      include: {
        sources: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getCollection(tenantId: string, collectionId: string) {
    const collection = await this.prisma.knowledgeCollection.findFirst({
      where: {
        id: collectionId,
        tenantId, // Enforce tenant isolation
      },
      include: {
        sources: {
          include: {
            chunks: {
              take: 10,
            },
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Knowledge collection not found');
    }

    return collection;
  }

  async addSource(
    tenantId: string,
    userId: string,
    collectionId: string,
    dto: CreateKnowledgeSource
  ) {
    await this.getCollection(tenantId, collectionId);

    const source = await this.prisma.knowledgeSource.create({
      data: {
        collectionId,
        type: dto.type,
        content: dto.content as any,
        metadata: dto.metadata || {},
      },
    });

    await this.auditLogService.record(
      tenantId,
      userId,
      'kb.source.add',
      'KnowledgeSource',
      source.id,
      { type: dto.type, collectionId }
    );

    // Trigger background job for processing (will be implemented with BullMQ)
    // For MVP, process inline
    await this.processSource(source.id);

    return source;
  }

  async processSource(sourceId: string) {
    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    // Delete existing chunks
    await this.prisma.knowledgeChunk.deleteMany({
      where: { sourceId },
    });

    let chunks: Array<{ content: string; metadata: any }> = [];

    if (source.type === 'qa') {
      // Process Q&A pairs
      const pairs = (source.content as any).pairs || [];
      chunks = pairs.map((pair: any, index: number) => ({
        content: `Q: ${pair.question}\nA: ${pair.answer}`,
        metadata: {
          type: 'qa',
          index,
          tags: pair.tags || [],
        },
      }));
    } else if (source.type === 'text') {
      // Naive chunking by paragraphs
      const text = (source.content as any).text || '';
      const paragraphs = text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);

      chunks = paragraphs.map((para: string, index: number) => ({
        content: para.trim(),
        metadata: {
          type: 'text',
          index,
          title: (source.content as any).title,
        },
      }));
    } else if (source.type === 'file') {
      // File content processing
      const content = (source.content as any).content || '';
      const paragraphs = content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);

      chunks = paragraphs.map((para: string, index: number) => ({
        content: para.trim(),
        metadata: {
          type: 'file',
          index,
          filename: (source.content as any).filename,
          mimeType: (source.content as any).mimeType,
        },
      }));
    }

    // Create chunks (embeddings will be added later)
    for (const chunk of chunks) {
      await this.prisma.knowledgeChunk.create({
        data: {
          sourceId,
          content: chunk.content,
          metadata: chunk.metadata,
        },
      });
    }

    return { chunksCreated: chunks.length };
  }

  async retrieve(
    collectionId: string,
    query: string,
    limit: number = 5,
    tenantId?: string
  ): Promise<Array<{ chunk: any; score: number; source: any }>> {
    const where: any = { id: collectionId };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const collection = await this.prisma.knowledgeCollection.findFirst({
      where,
      include: {
        sources: {
          include: {
            chunks: true,
          },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Knowledge collection not found');
    }

    // Naive keyword matching (MVP - will be replaced with embeddings later)
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    const results: Array<{ chunk: any; score: number; source: any }> = [];

    for (const source of collection.sources) {
      for (const chunk of source.chunks) {
        const contentLower = chunk.content.toLowerCase();
        let score = 0;

        // Simple TF scoring
        for (const term of queryTerms) {
          const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
          score += matches;
        }

        if (score > 0) {
          results.push({
            chunk,
            score,
            source: {
              id: source.id,
              type: source.type,
              metadata: source.metadata,
            },
          });
        }
      }
    }

    // Sort by score and return top results
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit).map((result) => ({
      ...result,
      chunk: {
        id: result.chunk.id,
        content: result.chunk.content,
        metadata: result.chunk.metadata,
      },
    }));
  }

  async getKBStatus(tenantId: string, botId: string) {
    const collections = await this.prisma.knowledgeCollection.findMany({
      where: {
        tenantId,
        botId,
      },
      include: {
        sources: {
          include: {
            chunks: true,
          },
        },
      },
    });

    const totalSources = collections.reduce((sum, col) => sum + col.sources.length, 0);
    const totalChunks = collections.reduce(
      (sum, col) => sum + col.sources.reduce((s, src) => s + src.chunks.length, 0),
      0
    );

    return {
      collectionsCount: collections.length,
      sourcesCount: totalSources,
      chunksCount: totalChunks,
      collections,
    };
  }
}
