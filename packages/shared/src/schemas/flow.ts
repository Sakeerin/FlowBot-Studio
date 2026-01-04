import { z } from 'zod';

// Node position
export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type NodePosition = z.infer<typeof nodePositionSchema>;

// Base node config
export const baseNodeDataSchema = z.object({
  label: z.string(),
});

// Node type-specific configs
export const startNodeDataSchema = baseNodeDataSchema.extend({
  label: z.literal('Start').optional(),
});

export const messageNodeDataSchema = baseNodeDataSchema.extend({
  content: z.string(),
  format: z.enum(['text', 'markdown', 'html']).optional().default('text'),
});

export const askCollectNodeDataSchema = baseNodeDataSchema.extend({
  prompt: z.string(),
  variableName: z.string(),
  variableType: z.enum(['string', 'number', 'boolean', 'email', 'phone']).default('string'),
  validation: z.object({
    required: z.boolean().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
});

export const conditionNodeDataSchema = baseNodeDataSchema.extend({
  conditions: z.array(z.object({
    variable: z.string(),
    operator: z.enum(['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains', 'exists']),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })),
  operator: z.enum(['AND', 'OR']).default('AND'),
});

export const routerNodeDataSchema = baseNodeDataSchema.extend({
  intentKeyword: z.string(),
  fallbackNodeId: z.string().optional(),
});

export const toolCallNodeDataSchema = baseNodeDataSchema.extend({
  toolId: z.string(),
  inputMapping: z.record(z.string()),
  outputMapping: z.record(z.string()).optional(),
});

export const aiAnswerNodeDataSchema = baseNodeDataSchema.extend({
  prompt: z.string(),
  contextVariables: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
});

export const handoffNodeDataSchema = baseNodeDataSchema.extend({
  queue: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  message: z.string().optional(),
});

export const endNodeDataSchema = baseNodeDataSchema.extend({
  label: z.literal('End').optional(),
});

// Union of all node data schemas
export const nodeDataSchema = z.union([
  startNodeDataSchema,
  messageNodeDataSchema,
  askCollectNodeDataSchema,
  conditionNodeDataSchema,
  routerNodeDataSchema,
  toolCallNodeDataSchema,
  aiAnswerNodeDataSchema,
  handoffNodeDataSchema,
  endNodeDataSchema,
]);

// Node schema
export const nodeSchema = z.object({
  id: z.string(),
  type: z.enum(['Start', 'Message', 'AskCollect', 'Condition', 'Router', 'ToolCall', 'AIAnswer', 'Handoff', 'End']),
  position: nodePositionSchema,
  data: nodeDataSchema,
});

export type Node = z.infer<typeof nodeSchema>;
export type NodeData = z.infer<typeof nodeDataSchema>;

// Edge schema
export const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string().default('default'),
  label: z.string().optional(),
  condition: z.object({
    variable: z.string(),
    operator: z.enum(['equals', 'notEquals']),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }).optional(),
});

export type Edge = z.infer<typeof edgeSchema>;

// FlowGraph DTO
export const flowGraphDtoSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  variables: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    defaultValue: z.unknown().optional(),
    description: z.string().optional(),
  })).optional().default({}),
});

export type FlowGraphDto = z.infer<typeof flowGraphDtoSchema>;

