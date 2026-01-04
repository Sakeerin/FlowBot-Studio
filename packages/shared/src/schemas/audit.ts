import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  tenantId: z.string().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  actorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

