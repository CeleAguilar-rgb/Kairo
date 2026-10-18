import 'server-only'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildTasks } from './mock'
import type { Task } from './types'

// Hoy devuelve datos de ejemplo. Con la API: `return api.get<Task[]>('/tasks')`.
export async function listTasks(): Promise<Task[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildTasks(ctx)
}

// Lo que aporta Tareas a Inicio (getHomeCard en docs/guides/modules.md):
// los pendientes con fecha de hoy, hechos incluidos (cuentan para el anillo).
export async function getTodayTasks(): Promise<Task[]> {
  const ctx = await getMockContext()
  const tasks = await listTasks()
  return tasks.filter((task) => task.dueOn === ctx.today)
}
