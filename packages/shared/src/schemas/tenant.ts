import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().email().optional(),
});

export type CreateTenant = z.infer<typeof createTenantSchema>;

