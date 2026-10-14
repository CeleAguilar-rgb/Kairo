import type { IsoDate } from '@/lib/dates'

// Forma de una tarea como la devolverá GET /v1/tasks (tabla tasks de
// docs/guides/data-model.md, en camelCase). Cuando exista el esquema Zod en
// packages/shared/src/tasks/, estos tipos se reemplazan por z.infer<…>.
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Subtask = {
  id: string
  title: string
  done: boolean
}

export type Task = {
  id: string
  title: string
  notes: string | null
  status: TaskStatus
  priority: TaskPriority
  dueOn: IsoDate | null
  doneAt: string | null
  position: number
  // La API resuelve el nombre pidiéndoselo al módulo de proyectos (no se leen sus tablas).
  project: { id: string; name: string } | null
  subtasks: Subtask[]
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}
