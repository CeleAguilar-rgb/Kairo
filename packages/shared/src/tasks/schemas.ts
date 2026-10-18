import { z } from 'zod'

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium'

// Tarea mínima del molde (Fase 1, paso 1): sin proyecto, sprint ni subtareas
// todavía (data-model.md ya deja esas columnas listas en la tabla; se usan
// cuando se construya Proyectos). status y position los pone el repository,
// nunca la persona: toda tarea nueva nace en 'todo'.
export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Escribe un título.').max(200),
  notes: z.string().trim().max(2000).optional(),
  priority: z.enum(TASK_PRIORITIES).default(DEFAULT_TASK_PRIORITY),
  dueOn: z.iso.date().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
