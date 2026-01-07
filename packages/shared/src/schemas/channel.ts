import { z } from 'zod';

export const channelTypeSchema = z.enum(['web', 'line', 'facebook', 'whatsapp', 'telegram']);

export type ChannelType = z.infer<typeof channelTypeSchema>;

export const createChannelConnectionSchema = z.object({
  botId: z.string().optional(),
  channel: channelTypeSchema,
  config: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
});

export type CreateChannelConnection = z.infer<typeof createChannelConnectionSchema>;

export const updateChannelConnectionSchema = z.object({
  botId: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateChannelConnection = z.infer<typeof updateChannelConnectionSchema>;

export const channelWebhookPayloadSchema = z.object({
  channel: channelTypeSchema,
  externalUserId: z.string(),
  messageId: z.string(),
  text: z.string().optional(),
  type: z.string().default('text'),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ChannelWebhookPayload = z.infer<typeof channelWebhookPayloadSchema>;

