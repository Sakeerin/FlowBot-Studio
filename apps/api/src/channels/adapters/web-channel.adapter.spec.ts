import { Test, TestingModule } from '@nestjs/testing';
import { WebChannelAdapter } from './web-channel.adapter';

describe('WebChannelAdapter', () => {
  let adapter: WebChannelAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebChannelAdapter],
    }).compile();

    adapter = module.get<WebChannelAdapter>(WebChannelAdapter);
  });

  describe('verifySignature', () => {
    it('should verify signature correctly', () => {
      const body = { test: 'data' };
      const secret = 'test-secret';
      const signature = 'test-secret';

      const result = adapter.verifySignature(body, signature, secret);
      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = { test: 'data' };
      const secret = 'test-secret';
      const signature = 'wrong-secret';

      const result = adapter.verifySignature(body, signature, secret);
      expect(result).toBe(false);
    });
  });

  describe('parseWebhook', () => {
    it('should parse webhook payload correctly', () => {
      const body = {
        userId: 'user123',
        messageId: 'msg123',
        text: 'Hello',
        type: 'text',
      };
      const config = {};

      const result = adapter.parseWebhook(body, config);

      expect(result.channel).toBe('web');
      expect(result.externalUserId).toBe('user123');
      expect(result.messageId).toBe('msg123');
      expect(result.text).toBe('Hello');
      expect(result.type).toBe('text');
    });

    it('should generate messageId if not provided', () => {
      const body = {
        userId: 'user123',
        text: 'Hello',
      };
      const config = {};

      const result = adapter.parseWebhook(body, config);

      expect(result.messageId).toBeDefined();
      expect(result.messageId).toContain('web-');
    });
  });

  describe('sendMessage', () => {
    it('should format message correctly', async () => {
      const externalUserId = 'user123';
      const message = {
        type: 'text',
        content: 'Hello',
        metadata: { test: 'data' },
      };
      const config = {};

      const result = await adapter.sendMessage(externalUserId, message, config);

      expect(result.userId).toBe(externalUserId);
      expect(result.message.type).toBe('text');
      expect(result.message.content).toBe('Hello');
      expect(result.message.metadata).toEqual({ test: 'data' });
    });
  });
});

