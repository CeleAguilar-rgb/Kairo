import { dayOfMonth, diffDays, formatMonthShort, WEEKDAYS_SHORT, weekdayOf, type IsoDate } from '@/lib/dates'

import type { Task } from './types'

export type TaskGroupKey = 'today' | 'week' | 'later' | 'undated' | 'done'

export type TaskGroup = { key: TaskGroupKey; name: string; items: Task[] }

const GROUP_NAME: Record<TaskGroupKey, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  later: 'Después',
  undated: 'Sin fecha',
  done: 'Hechas',
}

// Grupos de la vista Lista (Tareas.dc.html). Lo vencido cuenta como "Hoy":
// sigue pendiente y es lo primero que hay que ver. Los grupos vacíos no salen.
export function groupTasks(tasks: Task[], today: IsoDate, weekEnd: IsoDate, showDone: boolean): TaskGroup[] {
  const pending = tasks.filter((t) => t.status !== 'done')
  const byKey: Record<TaskGroupKey, Task[]> = { today: [], week: [], later: [], undated: [], done: [] }

  for (const task of pending) {
    if (!task.dueOn) byKey.undated.push(task)
    else if (task.dueOn <= today) byKey.today.push(task)
    else if (task.dueOn <= weekEnd) byKey.week.push(task)
    else byKey.later.push(task)
  }
  if (showDone) byKey.done = tasks.filter((t) => t.status === 'done')

  // Dentro de cada grupo: por fecha y luego por el orden que eligió la persona.
  const byDue = (a: Task, b: Task) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999') || a.position - b.position

  return (Object.keys(byKey) as TaskGroupKey[])
    .map((key) => ({ key, name: GROUP_NAME[key], items: byKey[key].sort(byDue) }))
    .filter((group) => group.items.length > 0)
}

// Etiqueta corta de la fecha límite: "Hoy", "Mañana", "Ayer", "Vie 9" (esta
// semana) o "12 oct" (más adelante).
export function dueLabel(dueOn: IsoDate | null, today: IsoDate, weekEnd: IsoDate): string {
  if (!dueOn) return 'Sin fecha'
  const diff = diffDays(today, dueOn)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 0 && dueOn <= weekEnd) return `${WEEKDAYS_SHORT[weekdayOf(dueOn)]} ${dayOfMonth(dueOn)}`
  return `${dayOfMonth(dueOn)} ${formatMonthShort(dueOn)}`
}

// 'today' (lavanda, negrita), 'overdue' (rojo) o 'normal', como en el canvas.
export function dueTone(task: Task, today: IsoDate): 'today' | 'overdue' | 'normal' {
  if (task.status === 'done' || !task.dueOn) return 'normal'
  if (task.dueOn === today) return 'today'
  return task.dueOn < today ? 'overdue' : 'normal'
}
