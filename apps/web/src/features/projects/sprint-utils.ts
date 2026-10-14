import { addDays, diffDays, formatDueLabel, type IsoDate } from '@/lib/dates'

import type { BacklogTask, Sprint, SprintTask, SprintTaskStatus } from './types'

// La lógica de la pestaña Sprints, como funciones puras (sin React): el componente solo
// guarda el estado y las llama. Con la API, "cerrar sprint" será una sola petición que hace
// todo esto en el servidor (en una transacción, para no dejar un sprint a medias).

export type SprintState = {
  active: Sprint | null
  // Las tareas del sprint activo.
  tasks: SprintTask[]
  backlog: BacklogTask[]
  // Los cerrados, del más reciente al más antiguo.
  closed: Sprint[]
}

export const SPRINT_COLUMNS: { status: SprintTaskStatus; label: string; empty: string }[] = [
  { status: 'todo', label: 'Por hacer', empty: 'Nada por hacer. Agrega desde el backlog.' },
  { status: 'in_progress', label: 'En curso', empty: 'Nada en curso.' },
  { status: 'done', label: 'Hecho', empty: 'Aún nada hecho.' },
]

const STATUS_ORDER: SprintTaskStatus[] = ['todo', 'in_progress', 'done']

// Mueve una tarea una columna hacia adelante (+1) o hacia atrás (-1); en los extremos no hace nada.
export function moveTask(tasks: SprintTask[], id: string, step: 1 | -1): SprintTask[] {
  return tasks.map((task) => {
    if (task.id !== id) return task
    const next = STATUS_ORDER[STATUS_ORDER.indexOf(task.status) + step]
    return next ? { ...task, status: next } : task
  })
}

// El texto bajo el título de una tarjeta del tablero.
export function taskMeta(task: SprintTask, today: IsoDate, weekEnd: IsoDate): string {
  if (task.status === 'done') return 'Hecha'
  if (task.dueOn === today) return 'Vence hoy'
  if (task.subtasksTotal > 0) return `${task.subtasksDone} de ${task.subtasksTotal} subtareas`
  return formatDueLabel(task.dueOn, today, weekEnd)
}

// Dónde va el sprint respecto a hoy: cuántos días dura, en qué día va (0 = el primero; negativo
// si todavía no empieza) y cuántos quedan contando hoy.
export function sprintDays(sprint: Sprint, today: IsoDate) {
  return {
    total: diffDays(sprint.startsOn, sprint.endsOn) + 1,
    index: diffDays(sprint.startsOn, today),
    left: diffDays(today, sprint.endsOn) + 1,
  }
}

// "Quedan 12 días", "Queda 1 día", "Termina hoy"… según dónde va el sprint.
export function daysLeftText(left: number, index: number): string {
  if (index < 0) return `Empieza en ${-index} ${-index === 1 ? 'día' : 'días'}`
  if (left > 1) return `Quedan ${left} días`
  if (left === 1) return 'Queda 1 día'
  return 'Ya terminó'
}

export type CloseOptions = {
  // Qué hacer con las tareas sin terminar: pasarlas al sprint siguiente o regresarlas al backlog.
  move: 'next' | 'back'
  weeks: 1 | 2
  // Las notas del sprint que se cierra (opcionales).
  notes: string
  // La meta del sprint siguiente (opcional).
  nextGoal: string
}

// Cierra el sprint activo y empieza el siguiente el día después de que terminaba (o hoy, si ya
// pasó). Las hechas se quedan en el sprint cerrado; las pendientes van donde se eligió.
export function closeSprint(state: SprintState, options: CloseOptions, today: IsoDate): { state: SprintState; message: string } {
  const { active } = state
  if (!active) return { state, message: '' }

  const done = state.tasks.filter((task) => task.status === 'done')
  const open = state.tasks.filter((task) => task.status !== 'done')
  const closedSprint: Sprint = {
    ...active,
    notes: options.notes.trim() || null,
    doneCount: done.length,
    totalCount: state.tasks.length,
  }

  const afterEnd = addDays(active.endsOn, 1)
  const startsOn = afterEnd > today ? afterEnd : today
  const carried = options.move === 'next' ? open.map((task) => ({ ...task, status: 'todo' as const })) : []
  const returned = options.move === 'back' ? open.map((task) => ({ id: task.id, title: task.title })) : []
  const next: Sprint = {
    id: `local-sprint-${active.number + 1}`,
    number: active.number + 1,
    goal: options.nextGoal.trim(),
    startsOn,
    endsOn: addDays(startsOn, options.weeks * 7 - 1),
    notes: null,
    doneCount: 0,
    totalCount: carried.length,
  }

  const outcome =
    open.length === 0
      ? 'todo quedó hecho'
      : `${open.length} ${options.move === 'next' ? (open.length === 1 ? 'pasó al siguiente' : 'pasaron al siguiente') : open.length === 1 ? 'regresó al backlog' : 'regresaron al backlog'}`

  return {
    state: { active: next, tasks: carried, backlog: [...returned, ...state.backlog], closed: [closedSprint, ...state.closed] },
    message: `Sprint ${active.number} cerrado · ${outcome}`,
  }
}

// Empieza un sprint hoy cuando no hay uno activo.
export function startSprint(state: SprintState, options: { goal: string; weeks: 1 | 2 }, today: IsoDate): SprintState {
  const number = (state.closed[0]?.number ?? 0) + 1
  const sprint: Sprint = {
    id: `local-sprint-${number}`,
    number,
    goal: options.goal.trim(),
    startsOn: today,
    endsOn: addDays(today, options.weeks * 7 - 1),
    notes: null,
    doneCount: 0,
    totalCount: 0,
  }
  return { ...state, active: sprint, tasks: [] }
}

// Agrega una tarea del backlog al sprint activo, en "Por hacer".
export function addFromBacklog(state: SprintState, id: string): SprintState {
  const item = state.backlog.find((task) => task.id === id)
  if (!item || !state.active) return state
  return {
    ...state,
    tasks: [...state.tasks, { id: item.id, title: item.title, status: 'todo', dueOn: null, subtasksDone: 0, subtasksTotal: 0 }],
    backlog: state.backlog.filter((task) => task.id !== id),
  }
}
