import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RuntimeService } from './runtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { NodeHandlerRegistry } from './handlers/node-handler.registry';
import { AuditLogService } from '../audit/audit-log.service';
import { BotVersionStatus } from '@prisma/client';

describe('RuntimeService', () => {
  let service: RuntimeService;
  let prismaService: PrismaService;
  let nodeHandlerRegistry: NodeHandlerRegistry;

  const mockPrismaService = {
    channelConnection: {
      findFirst: jest.fn(),
    },
    conversationSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    traceSpan: {
      create: jest.fn(),
    },
  };

  const mockNodeHandlerRegistry = {
    getHandler: jest.fn(),
  };

  const mockAuditLogService = {
    record: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuntimeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NodeHandlerRegistry,
          useValue: mockNodeHandlerRegistry,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<RuntimeService>(RuntimeService);
    prismaService = module.get<PrismaService>(PrismaService);
    nodeHandlerRegistry = module.get<NodeHandlerRegistry>(NodeHandlerRegistry);

    jest.clearAllMocks();
  });

  describe('processInbound', () => {
    it('should create new session if not exists', async () => {
      const payload = {
        messageId: 'msg-1',
        userId: 'user-1',
        channel: 'web',
        text: 'Hello',
        type: 'text' as const,
      };

      mockPrismaService.channelConnection.findFirst.mockResolvedValue({
        id: 'channel-1',
        tenantId: 'tenant-1',
        bot: {
          id: 'bot-1',
          versions: [
            {
              id: 'version-1',
              version: 1,
              status: BotVersionStatus.PUBLISHED,
              flowGraph: {
                nodes: [{ id: 'start-1', type: 'Start' }],
                edges: [],
              },
            },
          ],
        },
      });

      mockPrismaService.conversationSession.findFirst.mockResolvedValue(null);
      mockPrismaService.conversationSession.create.mockResolvedValue({
        id: 'session-1',
        channelConnectionId: 'channel-1',
        externalUserId: 'user-1',
        botId: 'bot-1',
        variables: {},
        currentNodeId: null,
      });

      mockPrismaService.message.create.mockResolvedValue({});
      mockNodeHandlerRegistry.getHandler.mockReturnValue({
        execute: jest.fn().mockResolvedValue({
          nextNodeId: null,
        }),
      });

      await service.processInbound('web', payload);

      expect(mockPrismaService.conversationSession.create).toHaveBeenCalled();
    });

    it('should handle idempotency', async () => {
      const payload = {
        messageId: 'msg-1',
        userId: 'user-1',
        channel: 'web',
        text: 'Hello',
        type: 'text' as const,
      };

      mockPrismaService.channelConnection.findFirst.mockResolvedValue({
        id: 'channel-1',
        tenantId: 'tenant-1',
        bot: {
          id: 'bot-1',
          versions: [
            {
              id: 'version-1',
              version: 1,
              status: BotVersionStatus.PUBLISHED,
              flowGraph: {
                nodes: [{ id: 'start-1', type: 'Start' }],
                edges: [],
              },
            },
          ],
        },
      });

      mockPrismaService.conversationSession.findFirst.mockResolvedValue({
        id: 'session-1',
        state: {
          processedMessageIds: ['msg-1'],
        },
      });

      mockPrismaService.message.findMany.mockResolvedValue([
        { id: 'msg-1', content: 'Response', role: 'bot' },
      ]);

      const result = await service.processInbound('web', payload);

      expect(result.messages).toBeDefined();
      expect(mockPrismaService.message.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if no active bot', async () => {
      const payload = {
        messageId: 'msg-1',
        userId: 'user-1',
        channel: 'web',
        text: 'Hello',
        type: 'text' as const,
      };

      mockPrismaService.channelConnection.findFirst.mockResolvedValue(null);

      await expect(service.processInbound('web', payload)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

