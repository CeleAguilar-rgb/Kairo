import 'server-only'

import { getMe } from '@/lib/account/api'
import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { todayIn } from '@/lib/dates'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildTasks } from './mock'
import type { Task } from './types'

// Modo demo (lib/demo.ts): no hay Supabase ni API, así que sigue con datos
// de ejemplo. Fuera de demo, ya pide la lista real.
export async function listTasks(): Promise<Task[]> {
  if (DEMO_MODE) {
    const ctx = await getMockContext()
    await mockDelay()
    return buildTasks(ctx)
  }
  return api.get<Task[]>('/tasks')
}

// Lo que aporta Tareas a Inicio (getHomeCard en docs/guides/modules.md):
// los pendientes con fecha de hoy, hechos incluidos (cuentan para el anillo).
export async function getTodayTasks(): Promise<Task[]> {
  const [tasks, me] = await Promise.all([listTasks(), getMe()])
  const today = todayIn(me?.profile.timezone ?? 'America/Mexico_City')
  return tasks.filter((task) => task.dueOn === today)
}
