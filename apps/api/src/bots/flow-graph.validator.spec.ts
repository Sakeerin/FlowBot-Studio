import { Test, TestingModule } from '@nestjs/testing';
import { FlowGraphValidator } from './flow-graph.validator';
import { FlowGraphDto } from '@shared/schemas/flow';

describe('FlowGraphValidator', () => {
  let validator: FlowGraphValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlowGraphValidator],
    }).compile();

    validator = module.get<FlowGraphValidator>(FlowGraphValidator);
  });

  describe('validate', () => {
    it('should detect missing Start node', () => {
      const flowGraph: FlowGraphDto = {
        nodes: [
          {
            id: 'node-1',
            type: 'Message',
            position: { x: 0, y: 0 },
            data: { label: 'Message', content: 'Hello' },
          },
        ],
        edges: [],
        variables: {},
      };

      const errors = validator.validate(flowGraph);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MISSING_START_NODE');
    });

    it('should detect multiple Start nodes', () => {
      const flowGraph: FlowGraphDto = {
        nodes: [
          {
            id: 'start-1',
            type: 'Start',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
          {
            id: 'start-2',
            type: 'Start',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
        ],
        edges: [],
        variables: {},
      };

      const errors = validator.validate(flowGraph);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('MULTIPLE_START_NODES');
    });

    it('should detect unreachable nodes', () => {
      const flowGraph: FlowGraphDto = {
        nodes: [
          {
            id: 'start-1',
            type: 'Start',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
          {
            id: 'node-1',
            type: 'Message',
            position: { x: 100, y: 0 },
            data: { label: 'Message', content: 'Hello' },
          },
          {
            id: 'orphan-1',
            type: 'Message',
            position: { x: 200, y: 0 },
            data: { label: 'Orphan', content: 'Orphan' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'node-1',
            type: 'default',
          },
        ],
        variables: {},
      };

      const errors = validator.validate(flowGraph);

      expect(errors.some((e) => e.code === 'UNREACHABLE_NODE')).toBe(true);
    });

    it('should detect missing node config', () => {
      const flowGraph: FlowGraphDto = {
        nodes: [
          {
            id: 'start-1',
            type: 'Start',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
          {
            id: 'message-1',
            type: 'Message',
            position: { x: 100, y: 0 },
            data: { label: 'Message', content: '' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'message-1',
            type: 'default',
          },
        ],
        variables: {},
      };

      const errors = validator.validate(flowGraph);

      expect(errors.some((e) => e.code === 'MISSING_NODE_CONFIG')).toBe(true);
    });

    it('should detect cycles without conditions', () => {
      const flowGraph: FlowGraphDto = {
        nodes: [
          {
            id: 'start-1',
            type: 'Start',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
          {
            id: 'node-1',
            type: 'Message',
            position: { x: 100, y: 0 },
            data: { label: 'Message', content: 'Hello' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'node-1',
            type: 'default',
          },
          {
            id: 'edge-2',
            source: 'node-1',
            target: 'node-1',
            type: 'default',
          },
        ],
        variables: {},
      };

      const errors = validator.validate(flowGraph);

      expect(errors.some((e) => e.code === 'CYCLE_DETECTED')).toBe(true);
    });

    it('should pass validation for valid flow graph', () => {
      const flowGraph: FlowGraphDto = {
        nodes: [
          {
            id: 'start-1',
            type: 'Start',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
          {
            id: 'message-1',
            type: 'Message',
            position: { x: 100, y: 0 },
            data: { label: 'Message', content: 'Hello' },
          },
          {
            id: 'end-1',
            type: 'End',
            position: { x: 200, y: 0 },
            data: { label: 'End' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'message-1',
            type: 'default',
          },
          {
            id: 'edge-2',
            source: 'message-1',
            target: 'end-1',
            type: 'default',
          },
        ],
        variables: {},
      };

      const errors = validator.validate(flowGraph);

      expect(errors).toHaveLength(0);
    });
  });
});

