import type { TaskPriority, TaskStatus } from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'

// Forma de una tarea como la devolverá GET /v1/tasks (tabla tasks de
// docs/guides/data-model.md, en camelCase). Los estados y prioridades salen
// de packages/shared (los mismos que valida createTaskSchema).
export type { TaskPriority, TaskStatus }

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

// Columnas del tablero y opciones de "Estado", en el orden del canvas.
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En curso',
  review: 'Revisión',
  done: 'Hecho',
}
