import type { IsoDate } from '@/lib/dates'

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

// La ÚNICA regla de "lo de hoy" (la usan la Lista y la tarjeta de Inicio): lo que vence
// hoy, hecho o no (cuenta para el anillo), más lo vencido que sigue pendiente. Lo
// vencido que ya se hizo no: era de otro día y ya quedó.
export function isForToday(task: Task, today: IsoDate): boolean {
  if (!task.dueOn) return false
  if (task.dueOn === today) return true
  return task.dueOn < today && task.status !== 'done'
}

// Grupos de la vista Lista (Tareas.dc.html). Lo vencido cuenta como "Hoy":
// sigue pendiente y es lo primero que hay que ver. Los grupos vacíos no salen.
export function groupTasks(tasks: Task[], today: IsoDate, weekEnd: IsoDate, showDone: boolean): TaskGroup[] {
  const pending = tasks.filter((t) => t.status !== 'done')
  const byKey: Record<TaskGroupKey, Task[]> = { today: [], week: [], later: [], undated: [], done: [] }

  for (const task of pending) {
    if (!task.dueOn) byKey.undated.push(task)
    else if (isForToday(task, today)) byKey.today.push(task)
    else if (task.dueOn <= weekEnd) byKey.week.push(task)
    else byKey.later.push(task)
  }
  if (showDone) byKey.done = tasks.filter((t) => t.status === 'done')

  return (Object.keys(byKey) as TaskGroupKey[])
    .map((key) => ({ key, name: GROUP_NAME[key], items: byKey[key].sort(byDue) }))
    .filter((group) => group.items.length > 0)
}

// Orden de las tareas abiertas (grupos de la Lista y columnas del Tablero): por fecha, las sin
// fecha al final, y luego por el orden que eligió la persona.
export function byDue(a: Task, b: Task): number {
  return (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999') || a.position - b.position
}

// Resumen bajo el título de Tareas: "21 pendientes: 1 para hoy, 8 vencidas y 3 más esta semana."
// Antes decía "N vencen esta semana" contando también lo vencido de días pasados, y parecía que
// todo era de hoy o de esta semana. Las partes en cero no se dicen.
export function summarizePending(tasks: Task[], today: IsoDate, weekEnd: IsoDate): string {
  const pending = tasks.filter((t) => t.status !== 'done')
  if (pending.length === 0) return 'No tienes pendientes.'
  const forToday = pending.filter((t) => t.dueOn === today).length
  const overdue = pending.filter((t) => t.dueOn !== null && t.dueOn < today).length
  const laterThisWeek = pending.filter((t) => t.dueOn !== null && t.dueOn > today && t.dueOn <= weekEnd).length

  const parts = [
    forToday > 0 ? `${forToday} para hoy` : null,
    overdue > 0 ? `${overdue} ${overdue === 1 ? 'vencida' : 'vencidas'}` : null,
    laterThisWeek > 0 ? `${laterThisWeek} más esta semana` : null,
  ].filter((part): part is string => part !== null)

  const total = `${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'}`
  if (parts.length === 0) return `${total}.`
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
  return `${total}: ${list}.`
}

// La misma etiqueta de fecha que usa Proyectos (lógica compartida en lib/dates).
export { formatDueLabel as dueLabel } from '@/lib/dates'

// 'today' (lavanda, negrita), 'overdue' (rojo) o 'normal', como en el canvas.
export function dueTone(task: Task, today: IsoDate): 'today' | 'overdue' | 'normal' {
  if (task.status === 'done' || !task.dueOn) return 'normal'
  if (task.dueOn === today) return 'today'
  return task.dueOn < today ? 'overdue' : 'normal'
}
