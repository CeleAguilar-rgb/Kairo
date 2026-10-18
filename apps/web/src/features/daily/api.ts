import 'server-only'

import { getMe } from '@/lib/account/api'
import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { listProjects } from '@/features/projects/api'
import { addDays, minutesNowIn, startOfMonth, startOfWeek, type IsoDate } from '@/lib/dates'
import { getMockContext, mockDelay, type MockContext } from '@/lib/mock/context'

import { HABIT_TARGET_PERCENT } from './goal-utils'
import { MEAL_ORDER, mealSlots } from './meal-utils'
import { buildDailySeed, FOCUS_AREA_LABEL, FOCUS_TASKS, pastStatus, TODAY_SUMMARY_EXTRAS, type DailySeed } from './mock'
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
  Meal,
  MealPlan,
  ReportRow,
  ReportWeek,
  Routine,
  RoutineBlock,
  RoutineBlockToday,
  RoutineDay,
  Streak,
} from './types'

// Lecturas de Día a día. Modo demo (lib/demo.ts): no hay Supabase ni API, se arma la misma semilla de
// datos de ejemplo que antes (mock.ts), pero fresca en cada lectura (ya no hay "mundo" persistido en
// memoria: con la API real las escrituras de actions.ts no pasan por aquí, igual que en Recordatorios
// y Agenda, así que el modo demo tampoco necesita simular esas escrituras).
// Con la API: cada función pide los hechos crudos (rutinas, bloques, registros) y hace exactamente la
// misma cuenta que antes (cellState, reportStats, streakLength…, todas en routine-utils.ts, sin tocar):
// el reporte, las rachas y el avance de una meta de hábito se siguen calculando aquí, no en la API
// (decisión #37 aplicada también a Día a día).

type LogRow = { blockId: string; date: IsoDate; doneAt: string; late: boolean; focusDone: number }
type LogsMap = Map<string, LogRow>

function logKey(date: IsoDate, blockId: string): string {
  return `${date}|${blockId}`
}

async function safeProjects() {
  return listProjects().catch(() => [])
}

function linkLabelOf(link: string, projects: { id: string; name: string }[]): string {
  return FOCUS_AREA_LABEL[link] ?? projects.find((project) => project.id === link)?.name ?? 'Tareas'
}

function blocksOf(blocks: RoutineBlock[], routineId: string): RoutineBlock[] {
  return blocks.filter((block) => block.routineId === routineId).sort((a, b) => startMinutes(a) - startMinutes(b) || a.position - b.position)
}

function routineFor(routines: Routine[], blocks: RoutineBlock[], date: IsoDate): { routine: Routine | null; blocks: RoutineBlock[] } {
  const routine = routines.find((item) => routineAppliesOn(item, date)) ?? null
  return { routine, blocks: routine ? blocksOf(blocks, routine.id) : [] }
}

// --- Modo demo --------------------------------------------------------------------------------------

async function loadSeed(): Promise<{ seed: DailySeed; ctx: MockContext; nowMinutes: number }> {
  const ctx = await getMockContext()
  const nowMinutes = minutesNowIn(ctx.timeZone)
  const weekStartPref = (await getMe())?.profile.weekStart ?? 'monday'
  const seed = buildDailySeed(ctx, startOfWeek(ctx.today, weekStartPref), nowMinutes)
  return { seed, ctx, nowMinutes }
}

type CellState = { status: CellStatus; doneAt: string | null }

function cellStateDemo(seed: DailySeed, ctx: MockContext, block: RoutineBlock, date: IsoDate): CellState {
  const routine = seed.routines.find((item) => item.id === block.routineId)
  if (!routine || !routineAppliesOn(routine, date)) return { status: 'off', doneAt: null }
  if (date > ctx.today) return { status: 'future', doneAt: null }
  if (date === ctx.today) {
    const log = seed.logs.get(logKey(date, block.id))
    if (!log) return { status: 'pending', doneAt: null }
    return { status: log.late ? 'late' : 'done', doneAt: log.doneAt }
  }
  return pastStatus(block, date)
}

// --- Con la API -------------------------------------------------------------------------------------

async function fetchRoutines() {
  return api.get<{ routines: Routine[]; blocks: RoutineBlock[] }>('/routines')
}

async function fetchLogs(from: IsoDate, to: IsoDate): Promise<LogsMap> {
  const rows = await api.get<LogRow[]>(`/routines/logs?from=${from}&to=${to}`)
  return new Map(rows.map((row) => [logKey(row.date, row.blockId), row]))
}

// pending si es hoy y no hay registro; skipped si ya pasó y no hay registro. Sin historia inventada: lo
// que no se marcó de verdad simplemente no tiene fila en routine_logs.
function cellStateReal(routines: Routine[], today: IsoDate, logs: LogsMap, block: RoutineBlock, date: IsoDate): CellState {
  const routine = routines.find((item) => item.id === block.routineId)
  if (!routine || !routineAppliesOn(routine, date)) return { status: 'off', doneAt: null }
  if (date > today) return { status: 'future', doneAt: null }
  const log = logs.get(logKey(date, block.id))
  if (!log) return { status: date === today ? 'pending' : 'skipped', doneAt: null }
  return { status: log.late ? 'late' : 'done', doneAt: log.doneAt }
}

// --- Hoy ------------------------------------------------------------------------------------------

// Los bloques de hoy, con cómo quedó cada uno. Es lo que lee la tarjeta "Ahora en tu rutina" de Inicio.
export async function getRoutineToday(): Promise<RoutineBlockToday[]> {
  return (await getDayRoutine()).blocks
}

export async function getDayRoutine(): Promise<RoutineDay> {
  const todayMeals = await getMealsToday()

  if (DEMO_MODE) {
    const { seed, ctx } = await loadSeed()
    await mockDelay()
    const { routine, blocks: base } = routineFor(seed.routines, seed.blocks, ctx.today)
    const withLog = base.map((block) => ({ ...block, log: seed.logs.get(logKey(ctx.today, block.id)) ?? null }))
    // Sin "mundo" persistido en memoria, el conteo de tareas de enfoque de hoy siempre nace en 0.
    return buildRoutineDay(routine, withLog, seed.blocks, todayMeals, () => 0)
  }

  const ctx = await getMockContext()
  const [{ routines, blocks: allBlocks }, logs] = await Promise.all([fetchRoutines(), fetchLogs(ctx.today, ctx.today)])
  const { routine, blocks: base } = routineFor(routines, allBlocks, ctx.today)
  const withLog = base.map((block) => {
    const log = logs.get(logKey(ctx.today, block.id))
    return { ...block, log: log ? { doneAt: log.doneAt, late: log.late } : null }
  })
  return buildRoutineDay(routine, withLog, allBlocks, todayMeals, (block) => {
    const tasks = block.link ? (FOCUS_TASKS[block.link] ?? []) : []
    const focusDone = logs.get(logKey(ctx.today, block.id))?.focusDone ?? 0
    return Math.min(focusDone, tasks.length)
  })
}

// Arma el día (focos y la nota dinámica de cada bloque) a partir de los bloques ya resueltos: lo mismo
// en modo demo y con la API, solo cambia de dónde sale doneCount.
async function buildRoutineDay(
  routine: Routine | null,
  base: RoutineBlockToday[],
  allBlocks: RoutineBlock[],
  todayMeals: MealPlan[],
  doneCountOf: (block: RoutineBlock) => number,
): Promise<RoutineDay> {
  const focusBlocks = base.filter((block) => block.kind === 'focus')
  const projects = focusBlocks.length > 0 ? await safeProjects() : []
  const focus: Record<string, FocusInfo> = {}
  for (const block of focusBlocks) {
    const tasks = block.link ? (FOCUS_TASKS[block.link] ?? []) : []
    const doneCount = doneCountOf(block)
    focus[block.id] = { areaLabel: block.link ? linkLabelOf(block.link, projects) : 'Tareas', tasks, doneCount }
  }

  const slots = mealSlots(allBlocks)
  const mealOf = (block: RoutineBlock) => MEAL_ORDER.find((meal) => slots[meal].time === block.startsAt && slots[meal].blockTitle === block.title)
  const dishFor = (meal: Meal) => todayMeals.find((plan) => plan.meal === meal)?.dish
  const blocks = base.map((block) => {
    if (block.kind === 'meal') {
      const meal = mealOf(block)
      return { ...block, note: (meal && dishFor(meal)) || block.note }
    }
    if (block.kind === 'focus') return { ...block, note: focus[block.id].tasks[focus[block.id].doneCount] ?? block.note }
    return block
  })
  return { routine, blocks, focus }
}

// Las rachas de Hoy: los tres bloques con más días seguidos hechos.
export async function getRoutineStreaks(): Promise<Streak[]> {
  if (DEMO_MODE) {
    const { seed, ctx } = await loadSeed()
    await mockDelay()
    const { routine, blocks } = routineFor(seed.routines, seed.blocks, ctx.today)
    if (!routine) return []
    const streaks = blocks.filter(countsForReport).map((block) => {
      const history = Array.from({ length: 60 }, (_, back) => cellStateDemo(seed, ctx, block, addDays(ctx.today, -back)).status)
      return { blockId: block.id, title: block.title, days: streakLength(history), dots: streakDots(history) }
    })
    return streaks.filter((streak) => streak.days > 0).sort((a, b) => b.days - a.days).slice(0, 3)
  }

  const ctx = await getMockContext()
  const [{ routines, blocks: allBlocks }, logs] = await Promise.all([fetchRoutines(), fetchLogs(addDays(ctx.today, -59), ctx.today)])
  const { routine, blocks } = routineFor(routines, allBlocks, ctx.today)
  if (!routine) return []
  const streaks = blocks.filter(countsForReport).map((block) => {
    const history = Array.from({ length: 60 }, (_, back) => cellStateReal(routines, ctx.today, logs, block, addDays(ctx.today, -back)).status)
    return { blockId: block.id, title: block.title, days: streakLength(history), dots: streakDots(history) }
  })
  return streaks.filter((streak) => streak.days > 0).sort((a, b) => b.days - a.days).slice(0, 3)
}

// "Tu día en resumen" del Diario: cuántos bloques van y lo demás que se cumplió hoy. Los extras (tareas
// hechas, eventos) siguen de ejemplo: todavía no se conecta con Tareas/Agenda (decisión #39).
export async function getDaySummary(): Promise<string[]> {
  const { blocks } = await getDayRoutine()
  const { done, total } = dayProgress(blocks)
  return [...(total > 0 ? [`${done} de ${total} bloques`] : []), ...TODAY_SUMMARY_EXTRAS]
}

// --- Rutina (editor) ------------------------------------------------------------------------------

export async function listRoutines(): Promise<{ routines: Routine[]; blocks: RoutineBlock[] }> {
  if (DEMO_MODE) {
    const { seed } = await loadSeed()
    await mockDelay()
    return { routines: seed.routines, blocks: seed.routines.flatMap((routine) => blocksOf(seed.blocks, routine.id)) }
  }
  return fetchRoutines()
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
  const { blocks } = await listRoutines()
  await mockDelay()
  return blocks
    .filter((block) => block.kind === 'habit' && countsForReport(block))
    .sort((a, b) => startMinutes(a) - startMinutes(b))
    .map((block) => ({ value: block.id, label: `${block.title} · ${block.startsAt}` }))
}

// --- Reporte --------------------------------------------------------------------------------------

export async function getReportWeek(weekStart: IsoDate): Promise<ReportWeek> {
  const dates = weekDates(weekStart)

  if (DEMO_MODE) {
    const { seed, ctx } = await loadSeed()
    await mockDelay()
    return buildReportWeek(weekStart, dates, seed.routines, seed.blocks, (block, date) => cellStateDemo(seed, ctx, block, date))
  }

  const ctx = await getMockContext()
  const [{ routines, blocks }, logs] = await Promise.all([fetchRoutines(), fetchLogs(dates[0], dates[6])])
  return buildReportWeek(weekStart, dates, routines, blocks, (block, date) => cellStateReal(routines, ctx.today, logs, block, date))
}

function buildReportWeek(
  weekStart: IsoDate,
  dates: IsoDate[],
  routines: Routine[],
  blocks: RoutineBlock[],
  stateOf: (block: RoutineBlock, date: IsoDate) => CellState,
): ReportWeek {
  const counted = routines.flatMap((routine) => blocksOf(blocks, routine.id)).filter(countsForReport)
  const rows: ReportRow[] = counted.map((block) => ({
    blockId: block.id,
    title: block.title,
    startsAt: block.startsAt,
    cells: dates.map((date) => ({ date, ...stateOf(block, date) })),
  }))

  const emptyRoutines = routines
    .filter((routine) => routine.active && routine.days.some(Boolean) && !counted.some((block) => block.routineId === routine.id))
    .map((routine) => ({ name: routine.name, daysText: joinDays(routine.days) }))
  const uncountedTitles = [...new Set(blocks.filter((block) => !countsForReport(block)).map((block) => block.title))]

  return { weekStart, rows, emptyRoutines, uncountedTitles }
}

// --- Menú -----------------------------------------------------------------------------------------

export async function getMealsToday(): Promise<MealPlan[]> {
  const ctx = await getMockContext()
  const week = await getMealWeek(startOfWeek(ctx.today, (await getMe())?.profile.weekStart ?? 'monday'))
  return MEAL_ORDER.flatMap((meal) => week.plans.find((plan) => plan.planDate === ctx.today && plan.meal === meal) ?? [])
}

// El menú de una semana (de `weekStart` a seis días después) y la hora y el bloque de cada comida.
export async function getMealWeek(weekStart: IsoDate): Promise<{ plans: MealPlan[]; slots: ReturnType<typeof mealSlots> }> {
  if (DEMO_MODE) {
    const { seed } = await loadSeed()
    await mockDelay()
    const dates = new Set(weekDates(weekStart))
    return { plans: [...seed.meals.values()].filter((plan) => dates.has(plan.planDate)), slots: mealSlots(seed.blocks) }
  }
  const [plans, { blocks }] = await Promise.all([api.get<MealPlan[]>(`/meal-plans?week=${weekStart}`), fetchRoutines()])
  return { plans, slots: mealSlots(blocks) }
}

// --- Diario ---------------------------------------------------------------------------------------

// Las entradas, la más reciente primero.
export async function listJournal(): Promise<JournalEntry[]> {
  if (DEMO_MODE) {
    const { seed } = await loadSeed()
    await mockDelay()
    return [...seed.journal].sort((a, b) => b.entryDate.localeCompare(a.entryDate))
  }
  return api.get<JournalEntry[]>('/journal-entries')
}

// --- Metas ----------------------------------------------------------------------------------------

// El porcentaje de días de este mes en que se cumplió un bloque (hechos entre hechos y saltados).
function habitRateDemo(seed: DailySeed, ctx: MockContext, blockId: string | null): number {
  const block = seed.blocks.find((item) => item.id === blockId)
  if (!block) return 0
  let ok = 0
  let total = 0
  for (let date = startOfMonth(ctx.today); date <= ctx.today; date = addDays(date, 1)) {
    const { status } = cellStateDemo(seed, ctx, block, date)
    if (status === 'done' || status === 'late') ok += 1
    if (status === 'done' || status === 'late' || status === 'skipped') total += 1
  }
  return total === 0 ? 0 : Math.round((ok / total) * 100)
}

function habitRateReal(routines: Routine[], blocks: RoutineBlock[], today: IsoDate, logs: LogsMap, blockId: string | null): number {
  const block = blocks.find((item) => item.id === blockId)
  if (!block) return 0
  let ok = 0
  let total = 0
  for (let date = startOfMonth(today); date <= today; date = addDays(date, 1)) {
    const { status } = cellStateReal(routines, today, logs, block, date)
    if (status === 'done' || status === 'late') ok += 1
    if (status === 'done' || status === 'late' || status === 'skipped') total += 1
  }
  return total === 0 ? 0 : Math.round((ok / total) * 100)
}

// El avance de una meta nunca se guarda a mano cuando sale de otra parte: hitos hechos, avance del
// proyecto o cumplimiento del bloque. Se calcula al leer (decisión #37/#39 aplicadas aquí).
function deriveGoal(goal: Goal, blocks: Pick<RoutineBlock, 'id' | 'title'>[], habitRate: (blockId: string | null) => number, projects: { id: string; name: string; progress: number }[]): Goal {
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
    const block = blocks.find((item) => item.id === goal.blockId)
    return {
      ...goal,
      target: HABIT_TARGET_PERCENT,
      current: goal.status === 'done' ? HABIT_TARGET_PERCENT : habitRate(goal.blockId),
      unit: '%',
      linkLabel: block ? `Ver bloque ${block.title} en el reporte` : null,
      linkHref: block ? '/dia-a-dia/reporte' : null,
    }
  }
  return goal
}

export async function listAllGoals(): Promise<Goal[]> {
  const projects = await safeProjects()

  if (DEMO_MODE) {
    const { seed, ctx } = await loadSeed()
    await mockDelay()
    return seed.goals.map((goal) => deriveGoal(goal, seed.blocks, (blockId) => habitRateDemo(seed, ctx, blockId), projects))
  }

  const ctx = await getMockContext()
  const [goals, { routines, blocks }] = await Promise.all([api.get<Goal[]>('/goals'), fetchRoutines()])
  const hasHabitGoal = goals.some((goal) => goal.kind === 'habit' && goal.status !== 'done')
  const logs = hasHabitGoal ? await fetchLogs(startOfMonth(ctx.today), ctx.today) : new Map<string, LogRow>()
  return goals.map((goal) => deriveGoal(goal, blocks, (blockId) => habitRateReal(routines, blocks, ctx.today, logs, blockId), projects))
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
