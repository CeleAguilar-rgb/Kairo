import 'server-only'

import { cache } from 'react'

import { listTasks } from '@/features/tasks/api'
import { api } from '@/lib/api-client'
import { addDays, startOfWeek, zonedToUtc } from '@/lib/dates'
import { DEMO_MODE } from '@/lib/demo'
import { getMockContext } from '@/lib/mock/context'

import { FOCUS_DEMO_SESSIONS_TODAY, FOCUS_TASK_OPTIONS } from './mock'
import type { FocusSessionRecord, FocusTask } from './types'

// Lecturas de Enfoque. La API devuelve las sesiones tal cual (decisión #38): los puntos de hoy, los minutos de la
// semana y los minutos por proyecto los arma este archivo. Modo demo (lib/demo.ts): no hay API, se usan los datos
// de ejemplo (mock.ts).

// Las sesiones desde un momento (UTC). `cache` hace que el layout y una pantalla las compartan en la misma página.
const loadSessions = cache(async (fromIso: string): Promise<FocusSessionRecord[]> => {
  if (DEMO_MODE) return []
  return api.get<FocusSessionRecord[]>(`/focus/sessions?from=${encodeURIComponent(fromIso)}`)
})

const loadTasks = cache(() => listTasks())

// El lunes de esta semana a las 00:00 en la zona del perfil, como momento UTC.
async function weekStartIso() {
  const ctx = await getMockContext()
  return zonedToUtc(startOfWeek(ctx.today, 'monday'), '00:00', ctx.timeZone)
}

// Lo que necesita el reproductor al montarse: cuántos pomodoros de trabajo van hoy y las tareas en las que se puede
// enfocar (las que no están hechas, con su id para guardar a cuál se le dedicó el tiempo). Si algo falla, el
// reproductor sigue funcionando sin eso (vacío) en vez de tumbar todo el dashboard.
export async function getFocusSetup(): Promise<{ sessionsToday: number; tasks: FocusTask[] }> {
  if (DEMO_MODE) return { sessionsToday: FOCUS_DEMO_SESSIONS_TODAY, tasks: FOCUS_TASK_OPTIONS.map((title) => ({ id: null, title })) }
  try {
    const ctx = await getMockContext()
    const todayStart = zonedToUtc(ctx.today, '00:00', ctx.timeZone)
    const tomorrowStart = zonedToUtc(addDays(ctx.today, 1), '00:00', ctx.timeZone)
    const [sessions, tasks] = await Promise.all([loadSessions(todayStart), loadTasks()])
    return {
      sessionsToday: sessions.filter((session) => session.kind === 'work' && session.startedAt >= todayStart && session.startedAt < tomorrowStart).length,
      tasks: tasks
        .filter((task) => task.status !== 'done')
        .slice(0, 30)
        .map((task) => ({ id: task.id, title: task.title })),
    }
  } catch {
    return { sessionsToday: 0, tasks: [] }
  }
}

// Los minutos de pomodoro de esta semana por proyecto ("con pomodoro esta semana" del Resumen de un proyecto): se
// suman las sesiones de trabajo de esta semana según el proyecto de la tarea a la que se le dedicaron.
export async function getFocusMinutesByProject(): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  if (DEMO_MODE) return totals
  const [sessions, tasks] = await Promise.all([weekStartIso().then(loadSessions), loadTasks()])
  const projectOf = new Map(tasks.flatMap((task) => (task.project ? [[task.id, task.project.id] as const] : [])))
  for (const session of sessions) {
    if (session.kind !== 'work' || !session.taskId) continue
    const projectId = projectOf.get(session.taskId)
    if (projectId) totals.set(projectId, (totals.get(projectId) ?? 0) + session.minutes)
  }
  return totals
}
