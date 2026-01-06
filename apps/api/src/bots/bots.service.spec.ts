import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BotsService } from './bots.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { FlowGraphValidator } from './flow-graph.validator';
import { BotVersionStatus } from '@prisma/client';

describe('BotsService', () => {
  let service: BotsService;
  let prismaService: PrismaService;
  let auditLogService: AuditLogService;
  let flowGraphValidator: FlowGraphValidator;

  const mockPrismaService = {
    bot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    flowGraph: {
      create: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    botVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockAuditLogService = {
    record: jest.fn(),
  };

  const mockFlowGraphValidator = {
    validate: jest.fn(() => []),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: FlowGraphValidator,
          useValue: mockFlowGraphValidator,
        },
      ],
    }).compile();

    service = module.get<BotsService>(BotsService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
    flowGraphValidator = module.get<FlowGraphValidator>(FlowGraphValidator);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a bot with draft flow graph', async () => {
      const dto = {
        name: 'Test Bot',
        description: 'Test description',
      };

      mockPrismaService.bot.create.mockResolvedValue({
        id: 'bot-1',
        tenantId: 'tenant-1',
        ...dto,
      });
      mockPrismaService.flowGraph.create.mockResolvedValue({});
      mockAuditLogService.record.mockResolvedValue(undefined);

      const result = await service.create('tenant-1', 'user-1', dto);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.bot.create).toHaveBeenCalled();
      expect(mockPrismaService.flowGraph.create).toHaveBeenCalled();
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if bot not found', async () => {
      mockPrismaService.bot.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('tenant-1', 'bot-1', [])
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should publish a bot version atomically', async () => {
      const botId = 'bot-1';
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      mockPrismaService.bot.findFirst.mockResolvedValue({
        id: botId,
        tenantId,
      });
      mockPrismaService.flowGraph.findFirst.mockResolvedValue({
        botId,
        isDraft: true,
        nodes: [{ id: 'start-1', type: 'Start' }],
        edges: [],
        variables: {},
      });
      mockPrismaService.botVersion.findFirst.mockResolvedValue(null);
      mockPrismaService.botVersion.create.mockResolvedValue({
        id: 'version-1',
        botId,
        version: 1,
        status: BotVersionStatus.PUBLISHED,
      });
      mockAuditLogService.record.mockResolvedValue(undefined);

      const result = await service.publish(tenantId, botId, userId, {});

      expect(result).toHaveProperty('version', 1);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        tenantId,
        userId,
        'bot.publish',
        'BotVersion',
        'version-1',
        expect.any(Object)
      );
    });

    it('should throw BadRequestException if validation fails', async () => {
      const botId = 'bot-1';
      const tenantId = 'tenant-1';

      mockPrismaService.bot.findFirst.mockResolvedValue({
        id: botId,
        tenantId,
      });
      mockPrismaService.flowGraph.findFirst.mockResolvedValue({
        botId,
        isDraft: true,
        nodes: [],
        edges: [],
        variables: {},
      });
      mockFlowGraphValidator.validate.mockReturnValue([
        { code: 'MISSING_START_NODE', message: 'Must have Start node' },
      ]);

      await expect(
        service.publish(tenantId, botId, 'user-1', {})
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rollback', () => {
    it('should rollback to a specific version atomically', async () => {
      const botId = 'bot-1';
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const version = 2;

      mockPrismaService.bot.findFirst.mockResolvedValue({
        id: botId,
        tenantId,
      });
      mockPrismaService.botVersion.findFirst.mockResolvedValue({
        id: 'version-2',
        botId,
        version: 2,
        status: BotVersionStatus.PUBLISHED,
        flowGraph: {
          nodes: [{ id: 'start-1', type: 'Start' }],
          edges: [],
          variables: {},
        },
      });
      mockPrismaService.flowGraph.updateMany.mockResolvedValue({ count: 1 });
      mockAuditLogService.record.mockResolvedValue(undefined);

      const result = await service.rollback(tenantId, botId, version, userId);

      expect(result).toHaveProperty('message');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        tenantId,
        userId,
        'bot.rollback',
        'BotVersion',
        'version-2',
        expect.any(Object)
      );
    });

    it('should throw NotFoundException if version not found', async () => {
      const botId = 'bot-1';
      const tenantId = 'tenant-1';

      mockPrismaService.bot.findFirst.mockResolvedValue({
        id: botId,
        tenantId,
      });
      mockPrismaService.botVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.rollback(tenantId, botId, 999, 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });
});

