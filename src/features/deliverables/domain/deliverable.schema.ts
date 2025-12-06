import { z } from 'zod';

export const deliverableStatusSchema = z.enum(['draft', 'in_review', 'approved', 'rejected', 'delivered']);
export const deliverableTypeSchema = z.enum(['image', 'video', 'document', 'archive', 'other']);

export const createDeliverableSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .nullable()
    .optional(),
  type: deliverableTypeSchema.default('other'),
  dueDate: z.string().datetime().nullable().optional(),
});

export const updateDeliverableSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .nullable()
    .optional(),
  status: deliverableStatusSchema.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  miroFrameId: z.string().nullable().optional(),
});

export const uploadVersionSchema = z.object({
  deliverableId: z.string().uuid('Invalid deliverable ID'),
  comment: z.string().max(500, 'Comment must be at most 500 characters').optional(),
});

export const feedbackSchema = z.object({
  deliverableId: z.string().uuid('Invalid deliverable ID'),
  versionId: z.string().uuid('Invalid version ID'),
  content: z
    .string()
    .min(1, 'Feedback cannot be empty')
    .max(1000, 'Feedback must be at most 1000 characters'),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).nullable().optional(),
});

export type CreateDeliverableSchema = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableSchema = z.infer<typeof updateDeliverableSchema>;
export type UploadVersionSchema = z.infer<typeof uploadVersionSchema>;
export type FeedbackSchema = z.infer<typeof feedbackSchema>;
