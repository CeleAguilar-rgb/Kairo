import 'server-only'

import { listProjects } from '@/features/projects/api'
import { addDays, startOfMonth, type IsoDate } from '@/lib/dates'
import { mockDelay } from '@/lib/mock/context'
import type { MockContext } from '@/lib/mock/context'

import { HABIT_TARGET_PERCENT } from './goal-utils'
import { MEAL_ORDER, mealKey, mealSlots } from './meal-utils'
import { FOCUS_AREA_LABEL, FOCUS_TASKS, pastStatus, TODAY_SUMMARY_EXTRAS } from './mock'
import { loadWorld, type DailyWorld } from './mock-store'
import {
  countsForReport,
  dayProgress,
  joinDays,
  routineAppliesOn,
  startMinutes,
  streakDots,
  streakLength,
  weekDates,
} from './routine-utils'
import type {
  CellStatus,
  FocusInfo,
  FocusLink,
  Goal,
  JournalEntry,
  MealPlan,
  ReportRow,
  ReportWeek,
  Routine,
  RoutineBlock,
  RoutineBlockToday,
  RoutineDay,
  Streak,
} from './types'

// Lecturas de Día a día. Con la API, cada función es un `api.get('/…')` y devuelve la misma forma de datos.
// Las escrituras están en actions.ts. Todo se mira desde "hoy" en la zona horaria del perfil.

// --- Piezas internas ------------------------------------------------------------------------------

// Los bloques de una rutina, en el orden del día.
function blocksOf(world: DailyWorld, routineId: string): RoutineBlock[] {
  return world.blocks
    .filter((block) => block.routineId === routineId)
    .sort((a, b) => startMinutes(a) - startMinutes(b) || a.position - b.position)
}

// La rutina que aplica en un día: la primera activa que lo incluye.
function routineFor(world: DailyWorld, date: IsoDate): Routine | null {
  return world.routines.find((routine) => routineAppliesOn(routine, date)) ?? null
}

function logKey(date: IsoDate, blockId: string): string {
  return `${date}|${blockId}`
}

type CellState = { status: CellStatus; doneAt: string | null }

// Cómo quedó un bloque en un día: el registro de hoy es de verdad; los días que ya pasaron son historia de
// ejemplo (pastStatus); los que no han llegado, "futuro"; y si la rutina no aplica ese día, "otra rutina".
function cellState(world: DailyWorld, ctx: MockContext, block: RoutineBlock, date: IsoDate): CellState {
  const routine = world.routines.find((item) => item.id === block.routineId)
  if (!routine || !routineAppliesOn(routine, date)) return { status: 'off', doneAt: null }
  if (date > ctx.today) return { status: 'future', doneAt: null }
  if (date === ctx.today) {
    const log = world.logs.get(logKey(date, block.id))
    if (!log) return { status: 'pending', doneAt: null }
    return { status: log.late ? 'late' : 'done', doneAt: log.doneAt }
  }
  return pastStatus(block, date)
}

function withLog(world: DailyWorld, today: IsoDate, block: RoutineBlock): RoutineBlockToday {
  return { ...block, log: world.logs.get(logKey(today, block.id)) ?? null }
}

async function safeProjects() {
  return listProjects().catch(() => [])
}

function linkLabelOf(link: string, projects: { id: string; name: string }[]): string {
  return FOCUS_AREA_LABEL[link] ?? projects.find((project) => project.id === link)?.name ?? 'Tareas'
}

// --- Hoy ------------------------------------------------------------------------------------------

// Los bloques de hoy, con cómo quedó cada uno. Es lo que lee la tarjeta "Ahora en tu rutina" de Inicio.
export async function getRoutineToday(): Promise<RoutineBlockToday[]> {
  return (await getDayRoutine()).blocks
}

export async function getDayRoutine(): Promise<RoutineDay> {
  const { world, ctx } = await loadWorld()
  await mockDelay()
  const routine = routineFor(world, ctx.today)
  const base = routine ? blocksOf(world, routine.id).map((block) => withLog(world, ctx.today, block)) : []

  const focusBlocks = base.filter((block) => block.kind === 'focus')
  const projects = focusBlocks.length > 0 ? await safeProjects() : []
  const focus: Record<string, FocusInfo> = {}
  for (const block of focusBlocks) {
    const tasks = block.link ? (FOCUS_TASKS[block.link] ?? []) : []
    const doneCount = Math.min(world.focusDone.get(logKey(ctx.today, block.id)) ?? 0, tasks.length)
    focus[block.id] = { areaLabel: block.link ? linkLabelOf(block.link, projects) : 'Tareas', tasks, doneCount }
  }

  // La línea gris de cada bloque: una comida muestra el platillo de hoy y el enfoque su siguiente tarea.
  const slots = mealSlots(world.blocks)
  const mealOf = (block: RoutineBlock) => MEAL_ORDER.find((meal) => slots[meal].time === block.startsAt && slots[meal].blockTitle === block.title)
  const blocks = base.map((block) => {
    if (block.kind === 'meal') {
      const meal = mealOf(block)
      return { ...block, note: (meal && world.meals.get(mealKey(ctx.today, meal))?.dish) || block.note }
    }
    if (block.kind === 'focus') return { ...block, note: focus[block.id].tasks[focus[block.id].doneCount] ?? block.note }
    return block
  })
  return { routine, blocks, focus }
}

// Las rachas de Hoy: los tres bloques con más días seguidos hechos.
export async function getRoutineStreaks(): Promise<Streak[]> {
  const { world, ctx } = await loadWorld()
  await mockDelay()
  const routine = routineFor(world, ctx.today)
  if (!routine) return []

  const streaks = blocksOf(world, routine.id)
    .filter(countsForReport)
    .map((block) => {
      const history = Array.from({ length: 60 }, (_, back) => cellState(world, ctx, block, addDays(ctx.today, -back)).status)
      return { blockId: block.id, title: block.title, days: streakLength(history), dots: streakDots(history) }
    })
  return streaks.filter((streak) => streak.days > 0).sort((a, b) => b.days - a.days).slice(0, 3)
}

// "Tu día en resumen" del Diario: cuántos bloques van y lo demás que se cumplió hoy.
export async function getDaySummary(): Promise<string[]> {
  const { blocks } = await getDayRoutine()
  const { done, total } = dayProgress(blocks)
  return [...(total > 0 ? [`${done} de ${total} bloques`] : []), ...TODAY_SUMMARY_EXTRAS]
}

// --- Rutina (editor) ------------------------------------------------------------------------------

export async function listRoutines(): Promise<{ routines: Routine[]; blocks: RoutineBlock[] }> {
  const { world } = await loadWorld()
  await mockDelay()
  return {
    routines: world.routines,
    blocks: world.routines.flatMap((routine) => blocksOf(world, routine.id)),
  }
}

// Las opciones de "Ligado a" de un bloque de enfoque: las tres áreas y los proyectos activos.
export async function listFocusLinks(): Promise<FocusLink[]> {
  await mockDelay()
  const projects = (await safeProjects()).filter((project) => project.status === 'active')
  const preview = (value: string) => FOCUS_TASKS[value]?.[0] ?? 'Tu siguiente tarea pendiente'
  return [
    ...(['school', 'work', 'personal'] as const).map((value) => ({ value, label: `Todo lo ${value === 'personal' ? 'Personal' : `de ${FOCUS_AREA_LABEL[value]}`}`, preview: preview(value) })),
    ...projects.map((project) => ({ value: project.id, label: `Proyecto: ${project.name}`, preview: preview(project.id) })),
  ]
}

// Los bloques de hábito que cuentan para el reporte: de ellos puede salir el avance de una meta de hábito.
export async function listHabitBlocks(): Promise<{ value: string; label: string }[]> {
  const { world } = await loadWorld()
  await mockDelay()
  return world.blocks
    .filter((block) => block.kind === 'habit' && countsForReport(block))
    .sort((a, b) => startMinutes(a) - startMinutes(b))
    .map((block) => ({ value: block.id, label: `${block.title} · ${block.startsAt}` }))
}

// --- Reporte --------------------------------------------------------------------------------------

export async function getReportWeek(weekStart: IsoDate): Promise<ReportWeek> {
  const { world, ctx } = await loadWorld()
  await mockDelay()
  const dates = weekDates(weekStart)

  const counted = world.routines.flatMap((routine) => blocksOf(world, routine.id)).filter(countsForReport)
  const rows: ReportRow[] = counted.map((block) => ({
    blockId: block.id,
    title: block.title,
    startsAt: block.startsAt,
    cells: dates.map((date) => ({ date, ...cellState(world, ctx, block, date) })),
  }))

  const emptyRoutines = world.routines
    .filter((routine) => routine.active && routine.days.some(Boolean) && !counted.some((block) => block.routineId === routine.id))
    .map((routine) => ({ name: routine.name, daysText: joinDays(routine.days) }))
  const uncountedTitles = [...new Set(world.blocks.filter((block) => !countsForReport(block)).map((block) => block.title))]

  return { weekStart, rows, emptyRoutines, uncountedTitles }
}

// --- Menú -----------------------------------------------------------------------------------------

export async function getMealsToday(): Promise<MealPlan[]> {
  const { world, ctx } = await loadWorld()
  await mockDelay()
  return MEAL_ORDER.flatMap((meal) => world.meals.get(mealKey(ctx.today, meal)) ?? [])
}

// El menú de una semana (de `weekStart` a seis días después) y la hora y el bloque de cada comida.
export async function getMealWeek(weekStart: IsoDate) {
  const { world } = await loadWorld()
  await mockDelay()
  const dates = new Set(weekDates(weekStart))
  const plans = [...world.meals.values()].filter((plan) => dates.has(plan.planDate))
  return { plans, slots: mealSlots(world.blocks) }
}

// --- Diario ---------------------------------------------------------------------------------------

// Las entradas, la más reciente primero.
export async function listJournal(): Promise<JournalEntry[]> {
  const { world } = await loadWorld()
  await mockDelay()
  return [...world.journal].sort((a, b) => b.entryDate.localeCompare(a.entryDate))
}

// --- Metas ----------------------------------------------------------------------------------------

// El porcentaje de días de este mes en que se cumplió un bloque (hechos entre hechos y saltados).
function habitRate(world: DailyWorld, ctx: MockContext, blockId: string | null): number {
  const block = world.blocks.find((item) => item.id === blockId)
  if (!block) return 0
  let ok = 0
  let total = 0
  for (let date = startOfMonth(ctx.today); date <= ctx.today; date = addDays(date, 1)) {
    const { status } = cellState(world, ctx, block, date)
    if (status === 'done' || status === 'late') ok += 1
    if (status === 'done' || status === 'late' || status === 'skipped') total += 1
  }
  return total === 0 ? 0 : Math.round((ok / total) * 100)
}

// El avance de una meta nunca se guarda a mano cuando sale de otra parte: hitos hechos, avance del
// proyecto o cumplimiento del bloque. Se calcula al leer, como lo hará la API.
function deriveGoal(world: DailyWorld, ctx: MockContext, goal: Goal, projects: { id: string; name: string; progress: number }[]): Goal {
  if (goal.kind === 'milestones') {
    return { ...goal, target: goal.milestones.length, current: goal.milestones.filter((milestone) => milestone.done).length }
  }
  if (goal.kind === 'project') {
    const project = projects.find((item) => item.id === goal.projectId)
    if (!project) return goal
    return {
      ...goal,
      target: 100,
      current: Math.round(project.progress * 100),
      unit: '%',
      linkLabel: `Ver proyecto ${project.name}`,
      linkHref: `/proyectos/${project.id}`,
    }
  }
  if (goal.kind === 'habit') {
    const block = world.blocks.find((item) => item.id === goal.blockId)
    return {
      ...goal,
      target: HABIT_TARGET_PERCENT,
      current: goal.status === 'done' ? HABIT_TARGET_PERCENT : habitRate(world, ctx, goal.blockId),
      unit: '%',
      linkLabel: block ? `Ver bloque ${block.title} en el reporte` : null,
      linkHref: block ? '/dia-a-dia/reporte' : null,
    }
  }
  return goal
}

export async function listAllGoals(): Promise<Goal[]> {
  const { world, ctx } = await loadWorld()
  await mockDelay()
  const projects = await safeProjects()
  return world.goals.map((goal) => deriveGoal(world, ctx, goal, projects))
}

// Las metas activas (la tarjeta "Metas" de Inicio).
export async function listGoals(): Promise<Goal[]> {
  return (await listAllGoals()).filter((goal) => goal.status === 'active')
}

// Los proyectos activos, para la lista "Proyecto" de una meta nueva.
export async function listProjectOptions(): Promise<{ value: string; label: string }[]> {
  const projects = (await safeProjects()).filter((project) => project.status === 'active')
  return projects.map((project) => ({ value: project.id, label: project.name }))
}
