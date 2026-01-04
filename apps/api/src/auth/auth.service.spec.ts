import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let auditLogService: AuditLogService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    roleAssignment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockAuditLogService = {
    record: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    auditLogService = module.get<AuditLogService>(AuditLogService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Example',
        domain: 'example.com',
      });
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        tenantId: 'tenant-1',
      });
      mockPrismaService.roleAssignment.create.mockResolvedValue({
        id: 'role-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: Role.BUILDER,
      });
      mockPrismaService.roleAssignment.findMany.mockResolvedValue([
        { role: Role.BUILDER },
      ]);
      mockJwtService.signAsync.mockResolvedValue('access-token');
      mockAuditLogService.record.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(dto.email);
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-1',
        email: dto.email,
        passwordHash: 'hashed-password',
        tenantId: 'tenant-1',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockPrismaService.roleAssignment.findMany.mockResolvedValue([
        { role: Role.BUILDER },
      ]);
      mockJwtService.signAsync.mockResolvedValue('access-token');
      mockAuditLogService.record.mockResolvedValue(undefined);

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe(dto.email);
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'user.login',
        'User',
        'user-1',
        {}
      );
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        passwordHash: 'hashed-password',
      });
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});

