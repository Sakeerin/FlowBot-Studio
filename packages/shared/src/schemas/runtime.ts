import { z } from 'zod';

export const runtimeInboundMessagePayloadSchema = z.object({
  messageId: z.string(),
  userId: z.string(),
  channel: z.enum(['web', 'line', 'facebook', 'telegram']),
  text: z.string().optional(),
  type: z.enum(['text', 'image', 'file', 'location', 'sticker']).default('text'),
  metadata: z.record(z.unknown()).optional().default({}),
  timestamp: z.string().datetime().optional(),
});

export type RuntimeInboundMessagePayload = z.infer<typeof runtimeInboundMessagePayloadSchema>;

export const runtimeOutboundMessageSchema = z.object({
  type: z.enum(['text', 'image', 'file', 'quickReply', 'carousel']),
  content: z.string(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type RuntimeOutboundMessage = z.infer<typeof runtimeOutboundMessageSchema>;

