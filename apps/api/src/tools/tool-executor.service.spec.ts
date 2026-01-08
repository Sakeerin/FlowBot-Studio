import { Test, TestingModule } from '@nestjs/testing';
import { ToolExecutorService } from './tool-executor.service';
import { ConfigService } from '@nestjs/config';
import { ToolDto } from '@shared/schemas/tool';
import { BadRequestException } from '@nestjs/common';

// Mock fetch globally
global.fetch = jest.fn();

describe('ToolExecutorService', () => {
  let service: ToolExecutorService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolExecutorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ToolExecutorService>(ToolExecutorService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('executeHttpTool', () => {
    it('should execute GET request successfully', async () => {
      const tool: ToolDto = {
        id: 'tool1',
        tenantId: 'tenant1',
        name: 'Test Tool',
        type: 'http',
        config: {
          method: 'GET',
          url: 'https://api.example.com/data',
          timeout: 30000,
          retries: 0,
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        secrets: {},
      };

      const mockResponse = { data: 'test' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const result = await service.execute(tool, {}, {});

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should execute POST request with body', async () => {
      const tool: ToolDto = {
        id: 'tool1',
        tenantId: 'tenant1',
        name: 'Test Tool',
        type: 'http',
        config: {
          method: 'POST',
          url: 'https://api.example.com/data',
          bodyTemplate: '{"name": "{{name}}"}',
          timeout: 30000,
          retries: 0,
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        secrets: {},
      };

      const mockResponse = { success: true };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const result = await service.execute(tool, { name: 'John' }, {});

      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          body: '{"name": "John"}',
        })
      );
    });

    it('should add Bearer token from secrets', async () => {
      const tool: ToolDto = {
        id: 'tool1',
        tenantId: 'tenant1',
        name: 'Test Tool',
        type: 'http',
        config: {
          method: 'GET',
          url: 'https://api.example.com/data',
          auth: {
            type: 'bearer',
            key: 'apiKey',
          },
          timeout: 30000,
          retries: 0,
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        secrets: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({}),
        headers: new Headers(),
      });

      await service.execute(tool, {}, { apiKey: 'test-token' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should retry on failure', async () => {
      const tool: ToolDto = {
        id: 'tool1',
        tenantId: 'tenant1',
        name: 'Test Tool',
        type: 'http',
        config: {
          method: 'GET',
          url: 'https://api.example.com/data',
          timeout: 30000,
          retries: 2,
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        secrets: {},
      };

      // First two attempts fail, third succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ success: true }),
          headers: new Headers(),
        });

      const result = await service.execute(tool, {}, {});

      expect(result.data).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error for unsupported tool type', async () => {
      const tool: ToolDto = {
        id: 'tool1',
        tenantId: 'tenant1',
        name: 'Test Tool',
        type: 'function' as any,
        config: {},
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        secrets: {},
      };

      await expect(service.execute(tool, {}, {})).rejects.toThrow(BadRequestException);
    });
  });
});
