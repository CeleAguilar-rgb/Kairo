import 'server-only'

import type { ModuleId } from '@kairo/shared'

import { listWeekEvents } from '@/features/agenda/api'
import { getMealsToday, getRoutineToday, listGoals } from '@/features/daily/api'
import { listUpcomingPayments } from '@/features/finance/api'
import { listActiveProjects } from '@/features/projects/api'
import { listUpcomingReminders } from '@/features/reminders/api'
import { getTodayTasks } from '@/features/tasks/api'

import type { HomeData } from './components/HomeView'

// Inicio no lee datos de nadie directo: le pide a cada módulo su parte (su
// api.ts público) y solo de los módulos prendidos. Todo en paralelo; si uno
// falla, su tarjeta llega como null y la UI muestra "Intentar de nuevo" solo ahí.
export async function getHomeData(enabled: ModuleId[]): Promise<HomeData> {
  const on = (id: ModuleId) => enabled.includes(id)
  const safe = <T,>(active: boolean, load: () => Promise<T>) => (active ? load().catch(() => null) : Promise.resolve(null))

  const [tasks, events, routine, goals, meals, payments, projects, reminders] = await Promise.all([
    safe(on('tasks'), getTodayTasks),
    safe(on('agenda'), listWeekEvents),
    safe(on('daily'), getRoutineToday),
    safe(on('daily'), listGoals),
    safe(on('daily'), getMealsToday),
    safe(on('finance'), listUpcomingPayments),
    safe(on('projects'), listActiveProjects),
    // Recordatorios siempre está prendido (ALWAYS_ENABLED en la API)
    safe(true, listUpcomingReminders),
  ])

  return { tasks, events, routine, goals, meals, payments, projects, reminders }
}
