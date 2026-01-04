import { z } from 'zod';

export const createBotSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  settings: z.record(z.unknown()).optional().default({}),
});

export type CreateBot = z.infer<typeof createBotSchema>;

export const updateBotSchema = createBotSchema.partial();

export type UpdateBot = z.infer<typeof updateBotSchema>;

export const publishBotRequestSchema = z.object({
  channelIds: z.array(z.string()).optional(),
  version: z.number().int().positive().optional(),
});

export type PublishBotRequest = z.infer<typeof publishBotRequestSchema>;

