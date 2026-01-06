import { Test, TestingModule } from '@nestjs/testing';
import { AskCollectNodeHandler } from './ask-collect-node.handler';

describe('AskCollectNodeHandler', () => {
  let handler: AskCollectNodeHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AskCollectNodeHandler],
    }).compile();

    handler = module.get<AskCollectNodeHandler>(AskCollectNodeHandler);
  });

  describe('execute', () => {
    it('should ask for input if variable not collected', async () => {
      const node = {
        id: 'ask-1',
        type: 'AskCollect',
        data: {
          label: 'Ask Name',
          prompt: 'What is your name?',
          variableName: 'userName',
          variableType: 'string',
        },
      };

      const variables = {};
      const payload = {
        messageId: 'msg-1',
        userId: 'user-1',
        channel: 'web',
        type: 'text' as const,
      };

      const result = await handler.execute(node, variables, payload, {
        edges: [],
      });

      expect(result.outgoingMessages).toBeDefined();
      expect(result.outgoingMessages?.length).toBeGreaterThan(0);
      expect(result.nextNodeId).toBe(node.id); // Stay on node
    });

    it('should collect variable from input', async () => {
      const node = {
        id: 'ask-1',
        type: 'AskCollect',
        data: {
          label: 'Ask Name',
          prompt: 'What is your name?',
          variableName: 'userName',
          variableType: 'string',
        },
      };

      const variables = {};
      const payload = {
        messageId: 'msg-1',
        userId: 'user-1',
        channel: 'web',
        text: 'John Doe',
        type: 'text' as const,
      };

      const result = await handler.execute(node, variables, payload, {
        edges: [{ source: 'ask-1', target: 'next-1' }],
      });

      expect(result.variableUpdates).toBeDefined();
      expect(result.variableUpdates?.userName).toBe('John Doe');
      expect(result.nextNodeId).toBe('next-1');
    });

    it('should validate email format', async () => {
      const node = {
        id: 'ask-1',
        type: 'AskCollect',
        data: {
          label: 'Ask Email',
          prompt: 'What is your email?',
          variableName: 'email',
          variableType: 'email',
        },
      };

      const variables = {};
      const payload = {
        messageId: 'msg-1',
        userId: 'user-1',
        channel: 'web',
        text: 'invalid-email',
        type: 'text' as const,
      };

      await expect(
        handler.execute(node, variables, payload, { edges: [] })
      ).rejects.toThrow('Invalid email format');
    });
  });
});

