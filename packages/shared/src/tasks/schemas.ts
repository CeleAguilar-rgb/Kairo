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

// PATCH /v1/tasks/:id (conventions.md: PATCH cambia parcialmente). Una
// subtarea es una fila de tasks como cualquier otra, así que el mismo
// endpoint sirve para moverla en el tablero, marcarla hecha desde el detalle,
// o alternar una subtarea: todas son "cambia el status de esta fila".
export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
})

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>
