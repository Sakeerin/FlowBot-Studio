import { z } from 'zod';

export const createHandoffTicketSchema = z.object({
  sessionId: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  queue: z.string().optional(),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateHandoffTicket = z.infer<typeof createHandoffTicketSchema>;

export const handoffTicketPayloadSchema = createHandoffTicketSchema;

export type HandoffTicketPayload = z.infer<typeof handoffTicketPayloadSchema>;

export const updateHandoffTicketSchema = z.object({
  status: z.enum(['open', 'assigned', 'resolved', 'closed']).optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateHandoffTicket = z.infer<typeof updateHandoffTicketSchema>;

