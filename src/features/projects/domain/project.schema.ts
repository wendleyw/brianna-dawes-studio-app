import { z } from 'zod';

export const projectStatusSchema = z.enum([
  'critical',
  'overdue',
  'urgent',
  'on_track',
  'in_progress',
  'review',
  'done',
]);
export const projectPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z
    .string()
    .max(10000, 'Descrição deve ter no máximo 10000 caracteres')
    .nullable()
    .optional(),
  status: projectStatusSchema.default('on_track'),
  priority: projectPrioritySchema.default('medium'),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  clientId: z.string().uuid('ID de cliente inválido'),
  designerIds: z.array(z.string().uuid()).default([]),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  miroBoardId: z.string().nullable().optional(),
  miroBoardUrl: z.string().url().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
});

export const projectFiltersSchema = z.object({
  status: z.union([projectStatusSchema, z.array(projectStatusSchema)]).optional(),
  priority: z.union([projectPrioritySchema, z.array(projectPrioritySchema)]).optional(),
  clientId: z.string().uuid().optional(),
  designerId: z.string().uuid().optional(),
  search: z.string().optional(),
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
});

export type CreateProjectSchema = z.infer<typeof createProjectSchema>;
export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;
export type ProjectFiltersSchema = z.infer<typeof projectFiltersSchema>;
