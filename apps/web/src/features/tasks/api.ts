import 'server-only'
import type { TaskPriority, TaskStatus } from '@kairo/shared'
import { cache } from 'react'
import { api } from '@/lib/api-client'

export type Task = {
  id: string
  title: string
  notes: string | null
  status: TaskStatus
  priority: TaskPriority
  dueOn: string | null
  doneAt: string | null
  position: number
}

// cache(): si Inicio y /tareas llegan a pedir la lista en el mismo request,
// React la deduplica en vez de llamar a la API dos veces (mismo patrón que
// getMe en lib/account/api.ts).
export const getTasks = cache(async (): Promise<Task[]> => {
  return api.get<Task[]>('/tasks')
})
