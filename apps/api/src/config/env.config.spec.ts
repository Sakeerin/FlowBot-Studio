import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './env.config';

describe('EnvConfig', () => {
  let service: EnvConfig;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvConfig,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                DATABASE_URL: 'postgresql://test',
                REDIS_URL: 'redis://test',
                JWT_SECRET: 'test-jwt-secret-32-chars-minimum',
                JWT_REFRESH_SECRET: 'test-refresh-secret-32-chars-minimum',
                ENCRYPTION_KEY: '01234567890123456789012345678901',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EnvConfig>(EnvConfig);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return database URL', () => {
    expect(service.databaseUrl).toBe('postgresql://test');
  });

  it('should return redis URL', () => {
    expect(service.redisUrl).toBe('redis://test');
  });
});

