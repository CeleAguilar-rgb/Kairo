import 'server-only'

import { getMe } from '@/lib/account/api'
import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { todayIn } from '@/lib/dates'
import { getMockContext, mockDelay } from '@/lib/mock/context'

import { isForToday } from './grouping'
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

// Lo que aporta Tareas a Inicio (getHomeCard en docs/guides/modules.md): lo mismo
// que el grupo "Hoy" de la Lista (isForToday), más lo de hoy ya hecho para el anillo.
// Las vencidas van primero.
export async function getTodayTasks(): Promise<Task[]> {
  const [tasks, me] = await Promise.all([listTasks(), getMe()])
  const today = todayIn(me?.profile.timezone ?? 'America/Mexico_City')
  return tasks
    .filter((task) => isForToday(task, today))
    .sort((a, b) => (a.dueOn ?? '').localeCompare(b.dueOn ?? '') || a.position - b.position)
}

// Cuántas tareas se marcaron hechas hoy (en la zona del perfil): "Tu día en resumen" del Diario.
export async function countTasksDoneToday(): Promise<number> {
  const [tasks, me] = await Promise.all([listTasks(), getMe()])
  const timeZone = me?.profile.timezone ?? 'America/Mexico_City'
  const today = todayIn(timeZone)
  return tasks.filter((task) => task.status === 'done' && task.doneAt && todayIn(timeZone, new Date(task.doneAt)) === today).length
}
