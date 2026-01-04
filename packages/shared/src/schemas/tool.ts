import { z } from 'zod';

export const httpToolConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  bodyTemplate: z.string().optional(),
  timeout: z.number().positive().optional().default(30000),
  retries: z.number().int().min(0).max(3).optional().default(0),
  auth: z.object({
    type: z.enum(['apiKey', 'bearer', 'basic']),
    key: z.string(),
  }).optional(),
});

export const toolConfigSchema = z.union([
  httpToolConfigSchema,
  z.object({}).passthrough(), // For future tool types
]);

export const createToolSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['http', 'function']).default('http'),
  config: toolConfigSchema,
  secrets: z.record(z.string()).optional(),
});

export type CreateTool = z.infer<typeof createToolSchema>;

export const toolDtoSchema = createToolSchema.extend({
  id: z.string(),
  tenantId: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ToolDto = z.infer<typeof toolDtoSchema>;

