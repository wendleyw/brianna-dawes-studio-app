import { z } from 'zod';

export const deliverableStatusSchema = z.enum(['draft', 'in_review', 'approved', 'rejected', 'delivered']);
export const deliverableTypeSchema = z.enum(['image', 'video', 'document', 'archive', 'other']);

export const createDeliverableSchema = z.object({
  projectId: z.string().uuid('ID de projeto inválido'),
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .nullable()
    .optional(),
  type: deliverableTypeSchema.default('other'),
  dueDate: z.string().datetime().nullable().optional(),
});

export const updateDeliverableSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .nullable()
    .optional(),
  status: deliverableStatusSchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  miroFrameId: z.string().nullable().optional(),
});

export const uploadVersionSchema = z.object({
  deliverableId: z.string().uuid('ID de deliverable inválido'),
  comment: z.string().max(500, 'Comentário deve ter no máximo 500 caracteres').optional(),
});

export const feedbackSchema = z.object({
  deliverableId: z.string().uuid('ID de deliverable inválido'),
  versionId: z.string().uuid('ID de versão inválido'),
  content: z
    .string()
    .min(1, 'Feedback não pode estar vazio')
    .max(1000, 'Feedback deve ter no máximo 1000 caracteres'),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).nullable().optional(),
});

export type CreateDeliverableSchema = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableSchema = z.infer<typeof updateDeliverableSchema>;
export type UploadVersionSchema = z.infer<typeof uploadVersionSchema>;
export type FeedbackSchema = z.infer<typeof feedbackSchema>;
