import { z } from 'zod';
import { flowGraphDtoSchema } from './flow';

export const packManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  industry: z.string(),
  icon: z.string().optional(),
  bot: z.object({
    name: z.string(),
    description: z.string().optional(),
    settings: z
      .object({
        kbOnly: z.boolean().optional(),
        approvalRequired: z.boolean().optional(),
        allowedToolIds: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  flowGraph: flowGraphDtoSchema,
  variableSchema: z
    .record(
      z.object({
        type: z.enum(['string', 'number', 'boolean', 'date']),
        defaultValue: z.any().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
  knowledge: z
    .object({
      collections: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            sources: z.array(
              z.object({
                type: z.enum(['qa', 'text', 'file']),
                content: z.string(),
                metadata: z.record(z.unknown()).optional(),
              })
            ),
          })
        )
        .optional(),
    })
    .optional(),
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        config: z.object({
          method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
          url: z.string(),
          headers: z.record(z.string()).optional(),
          auth: z
            .object({
              type: z.enum(['apiKey', 'bearer', 'basic']),
              key: z.string(),
              value: z.string(),
            })
            .optional(),
          bodyTemplate: z.string().optional(),
          timeout: z.number().optional(),
          retries: z.number().optional(),
        }),
        secrets: z.record(z.string()).optional(),
      })
    )
    .optional(),
});

export type PackManifest = z.infer<typeof packManifestSchema>;

export const installPackRequestSchema = z.object({
  packId: z.string(),
  botName: z.string().optional(),
  variables: z.record(z.any()).optional(),
  toolSecrets: z.record(z.string()).optional(),
});

export type InstallPackRequest = z.infer<typeof installPackRequestSchema>;
