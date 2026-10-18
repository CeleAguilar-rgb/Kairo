import { z } from 'zod'

import { TASK_PRIORITIES, TASK_STATUSES } from './constants'

// Formulario "Nueva tarea" (panel lateral de TareaNueva.dc.html). La fecha es
// un día suelto (due_on, 'AAAA-MM-DD'): las tareas no llevan hora.
export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Escribe qué hay que hacer para crear la tarea.').max(200, 'Máximo 200 caracteres.'),
  projectId: z.uuid().nullable(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueOn: z.iso.date().nullable(),
  subtasks: z.array(z.string().trim().min(1).max(200)).max(50),
  notes: z.string().trim().max(5000).nullable(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
