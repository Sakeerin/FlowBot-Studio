import { z } from 'zod';

export const createKnowledgeCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  botId: z.string().optional(),
});

export type CreateKnowledgeCollection = z.infer<typeof createKnowledgeCollectionSchema>;

export const qaPairSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export const createKnowledgeSourceSchema = z.object({
  collectionId: z.string(),
  type: z.enum(['qa', 'text', 'file']),
  content: z.union([
    z.object({
      // For Q&A pairs
      pairs: z.array(qaPairSchema),
    }),
    z.object({
      // For plain text
      text: z.string(),
      title: z.string().optional(),
    }),
    z.object({
      // For file upload
      filename: z.string(),
      content: z.string(), // Base64 or text content
      mimeType: z.string().optional(),
    }),
  ]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateKnowledgeSource = z.infer<typeof createKnowledgeSourceSchema>;

export const kbIngestionRequestSchema = createKnowledgeSourceSchema;

export type KBIngestionRequest = z.infer<typeof kbIngestionRequestSchema>;

