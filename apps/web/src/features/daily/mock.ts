import 'server-only'

import { addDays, minutesToWallTime, wallTimeToMinutes, type IsoDate } from '@/lib/dates'
import { PROJECT_ID } from '@/lib/mock/ids'
import type { MockContext } from '@/lib/mock/context'

import { HABIT_TARGET_PERCENT } from './goal-utils'
import { mealKey } from './meal-utils'
import { isLateMark, mondayIndex } from './routine-utils'
import type {
  BlockLog,
  CellStatus,
  Goal,
  JournalEntry,
  Meal,
  MealPlan,
  MoodLevel,
  Routine,
  RoutineBlock,
  RoutineIcon,
  RoutineKind,
  RoutineNag,
} from './types'

// Datos de ejemplo de DiaADia.dc.html, RutinaEditar.dc.html, MenuSemanal.dc.html, Reporte.dc.html,
// Diario.dc.html y Metas.dc.html. Todo es relativo a "hoy" (ctx.day) para que la app se vea viva.
// Con la API ya conectada (decisión #37/#39 aplicadas a Día a día), este archivo solo sirve de lectura
// para el modo demo (api.ts, cuando DEMO_MODE): lo que el usuario hace ahí ya no se guarda (igual que en
// Recordatorios y Agenda, las Server Actions de actions.ts siempre llaman a la API real).

export type DailySeed = {
  routines: Routine[]
  blocks: RoutineBlock[]
  logs: Map<string, BlockLog>
  meals: Map<string, MealPlan>
  journal: JournalEntry[]
  goals: Goal[]
}

// --- Rutina ---------------------------------------------------------------------------------------

export const WEEKDAYS_ROUTINE_ID = 'routine-weekdays'
export const WEEKEND_ROUTINE_ID = 'routine-weekend'

type BlockSeed = {
  id: string
  start: string
  end?: string
  title: string
  kind: RoutineKind
  icon: RoutineIcon
  nag?: RoutineNag
  alert?: boolean
  counts?: boolean
  link?: string
  note?: string
}

// Los 13 bloques de "Entre semana" del canvas.
const BLOCK_SEEDS: BlockSeed[] = [
  { id: 'wake', start: '07:00', title: 'Despertar', kind: 'habit', icon: 'sun', alert: true },
  { id: 'w1', start: '07:15', title: 'Tomar agua', kind: 'habit', icon: 'drop', alert: true, nag: 30 },
  { id: 'des', start: '07:30', title: 'Desayunar', kind: 'meal', icon: 'food', alert: true },
  { id: 'vit', start: '08:00', title: 'Vitaminas', kind: 'habit', icon: 'pill', alert: true, nag: 15 },
  { id: 'job', start: '09:00', end: '17:00', title: 'Trabajo', kind: 'free', icon: 'work', alert: false, counts: false },
  { id: 'w2', start: '11:00', title: 'Tomar agua', kind: 'habit', icon: 'drop', alert: true, nag: 30 },
  { id: 'com', start: '14:00', title: 'Comer', kind: 'meal', icon: 'food', alert: true, nag: 30 },
  { id: 'w3', start: '16:00', title: 'Tomar agua', kind: 'habit', icon: 'drop', alert: true, nag: 30 },
  { id: 'esc', start: '17:00', end: '18:30', title: 'Avanzar escuela', kind: 'focus', icon: 'cap', alert: true, nag: 15, link: 'school' },
  { id: 'dash', start: '19:00', end: '20:00', title: 'Proyecto personal', kind: 'focus', icon: 'code', alert: true, link: PROJECT_ID.dash },
  { id: 'cen', start: '20:30', title: 'Cenar', kind: 'meal', icon: 'food', alert: true },
  { id: 'esr', start: '21:30', title: 'Escribir', kind: 'habit', icon: 'pen', alert: true, note: 'Auralun · 500 palabras' },
  { id: 'zz', start: '23:00', title: 'Dormir', kind: 'habit', icon: 'moon', alert: true, note: 'Sin pantallas desde 22:30' },
]

function seedBlocks(): RoutineBlock[] {
  return BLOCK_SEEDS.map((seed, position) => ({
    id: seed.id,
    routineId: WEEKDAYS_ROUTINE_ID,
    startsAt: seed.start,
    endsAt: seed.end ?? null,
    title: seed.title,
    kind: seed.kind,
    icon: seed.icon,
    position,
    alert: seed.alert ?? true,
    nagMinutes: seed.nag ?? 0,
    countsForReport: seed.counts ?? true,
    link: seed.link ?? null,
    note: seed.note ?? null,
  }))
}

function seedRoutines(): Routine[] {
  return [
    { id: WEEKDAYS_ROUTINE_ID, name: 'Entre semana', days: [true, true, true, true, true, false, false], active: true },
    { id: WEEKEND_ROUTINE_ID, name: 'Fin de semana', days: [false, false, false, false, false, true, true], active: true },
  ]
}

// Cómo quedó cada bloque hoy, según la hora a la que arranca el servidor de ejemplo: lo que ya empezó se
// marcó a los pocos minutos, salvo dos casos para que siempre haya con qué ver los estados del canvas:
// "Vitaminas" quedó marcado tarde y el tercer "Tomar agua" nunca se marcó.
function seedLogs(today: IsoDate, nowMinutes: number): Map<string, BlockLog> {
  const logs = new Map<string, BlockLog>()
  const blocks = seedBlocks()
  for (const seed of BLOCK_SEEDS) {
    if (seed.kind === 'free' || seed.id === 'w3') continue
    const block = blocks.find((b) => b.id === seed.id)
    if (!block) continue
    const start = wallTimeToMinutes(seed.start)
    const lateAt = start + (seed.nag ?? 30) + 20
    if (seed.id === 'vit' && nowMinutes >= lateAt) {
      logs.set(`${today}|${seed.id}`, { doneAt: minutesToWallTime(lateAt), late: true })
      continue
    }
    // Un bloque con rango solo se da por hecho cuando termina.
    const finishedAt = seed.end ? wallTimeToMinutes(seed.end) : start + 5
    if (nowMinutes >= finishedAt) {
      const at = Math.min(finishedAt, nowMinutes)
      logs.set(`${today}|${seed.id}`, { doneAt: minutesToWallTime(at), late: isLateMark(block, at) })
    }
  }
  return logs
}

// --- Historia del reporte ---------------------------------------------------------------------------

// Un número estable para (bloque, día): la misma celda sale igual en cada visita. Es historia inventada;
// con la API, esto sale de routine_logs.
function hash(text: string): number {
  let value = 5381
  for (let index = 0; index < text.length; index += 1) value = ((value << 5) + value + text.charCodeAt(index)) >>> 0
  // Sin este remate, dos días seguidos darían números seguidos (el último carácter solo suma 1) y la historia
  // saldría en rachas largas de lo mismo. Estas tres vueltas mezclan los bits para que cada día sea independiente.
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b)
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35)
  return (value ^ (value >>> 16)) >>> 0
}

// La historia de un bloque en un día que ya pasó: 66% a tiempo, 14% tarde y 20% saltado, más o menos.
export function pastStatus(block: RoutineBlock, date: IsoDate): { status: Extract<CellStatus, 'done' | 'late' | 'skipped'>; doneAt: string | null } {
  const roll = hash(`${block.id}|${date}`) % 100
  const start = wallTimeToMinutes(block.startsAt)
  if (roll < 66) return { status: 'done', doneAt: minutesToWallTime(start + 5) }
  if (roll < 80) return { status: 'late', doneAt: minutesToWallTime(Math.min(1439, start + (block.nagMinutes || 30) + 20)) }
  return { status: 'skipped', doneAt: null }
}

// --- Menú -----------------------------------------------------------------------------------------

// Las dos semanas del canvas, de lunes a domingo (desayuno, comida, cena).
const MENU_DISHES: Record<Meal, string[]> = {
  breakfast: ['Hotcakes de avena con plátano', 'Chilaquiles verdes', 'Hotcakes de avena con plátano', 'Avena con plátano', 'Yogur con granola y fruta', 'Molletes', ''],
  lunch: ['Pollo en salsa verde con arroz', 'Pollo en salsa verde con arroz', 'Tinga con arroz', 'Tinga con arroz', 'Picadillo con papa', 'Pasta con pollo', 'Comida familiar'],
  dinner: ['Sincronizadas', 'Tostadas de pollo', 'Sándwich de pollo', 'Quesadillas con frijoles', 'Pizza', '', 'Cereal con leche'],
}

const MENU_NOTES: Record<string, string> = {
  'lunch|3': 'Sacar del congelador la noche anterior',
  'lunch|6': 'Casa de mi mamá, 13:00',
}

const MEAL_DONE_AT: Record<Meal, number> = {
  breakfast: wallTimeToMinutes('08:30'),
  lunch: wallTimeToMinutes('15:00'),
  dinner: wallTimeToMinutes('21:15'),
}

// El menú de la semana en curso y la anterior (de lunes a domingo cada una); la semana que viene queda en
// blanco, como en el canvas, para ver el estado "Semana sin menú".
function seedMeals(today: IsoDate, currentWeekStart: IsoDate, nowMinutes: number): Map<string, MealPlan> {
  const meals = new Map<string, MealPlan>()
  for (let offset = -7; offset <= 6; offset += 1) {
    const date = addDays(currentWeekStart, offset)
    // Los platillos están escritos de lunes a domingo, sin importar con qué día empiece la semana.
    const index = mondayIndex(date)
    for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
      const dish = MENU_DISHES[meal][index]
      if (!dish) continue
      meals.set(mealKey(date, meal), {
        id: `meal-${date}-${meal}`,
        planDate: date,
        meal,
        dish,
        done: date < today || (date === today && nowMinutes > MEAL_DONE_AT[meal]),
        // La comida de lunes a viernes es meal prep.
        prep: meal === 'lunch' && index < 5,
        note: MENU_NOTES[`${meal}|${index}`] ?? null,
        hasEvent: dish === 'Comida familiar',
      })
    }
  }
  return meals
}

// --- Diario ---------------------------------------------------------------------------------------

type EntrySeed = { mood: MoodLevel; text: string; summary: string[]; gratitude?: string[] }

// Las entradas de los días anteriores (los cuatro primeros son los textos del canvas).
const ENTRY_SEEDS: EntrySeed[] = [
  { mood: 3, text: 'La revisión del bot con mi jefe salió bien; le gustó la propuesta de módulos. Avancé la agenda del dashboard.', summary: ['10 de 12 bloques', '3 tareas hechas', 'Revisión del bot'] },
  { mood: 2, text: 'Día pesado. Me la pasé separando módulos del bot y no me dio tiempo de escribir.', summary: ['8 de 12 bloques', '2 tareas hechas', 'Bloque de enfoque'] },
  { mood: 3, text: 'Dejé listo el meal prep de la semana y empecé a revisar lo de la ingeniería.', summary: ['11 de 12 bloques', '1 tarea hecha', 'Meal prep'] },
  { mood: 4, text: 'Día tranquilo. Escribí una escena larga de Auralun y salí a caminar.', summary: ['Fin de semana', 'Escribir · 1,200 palabras'] },
  { mood: 4, text: 'Salí temprano a caminar y avancé lo de la inscripción sin prisa.', summary: ['Fin de semana', '1 tarea hecha'] },
  { mood: 2, text: 'Me costó arrancar, pero al final dejé cerrado el sprint.', summary: ['9 de 12 bloques', '4 tareas hechas'] },
  { mood: 3, text: 'Buen día de enfoque: avancé el módulo de Recordatorios.', summary: ['10 de 12 bloques', '2 tareas hechas'] },
]

function seedJournal(today: IsoDate): JournalEntry[] {
  return ENTRY_SEEDS.map((seed, index) => {
    const date = addDays(today, -(index + 1))
    return {
      id: `entry-${date}`,
      entryDate: date,
      mood: seed.mood,
      body: seed.text,
      gratitude: seed.gratitude ?? [],
      tags: [],
      summary: seed.summary,
      savedAt: `${date}T23:30:00.000Z`,
    }
  })
}

// --- Metas ----------------------------------------------------------------------------------------

function seedGoals(ctx: MockContext): Goal[] {
  const base = { blockId: null, projectId: null, linkLabel: null, linkHref: null, achievedOn: null, milestones: [], log: [], why: '' } satisfies Partial<Goal>
  return [
    {
      ...base,
      id: 'goal-ing',
      title: 'Entrar a la ingeniería',
      area: 'school',
      kind: 'milestones',
      status: 'active',
      target: 5,
      current: 1,
      unit: '',
      dueOn: ctx.day(110),
      why: 'Tener la base formal para crecer como desarrollador',
      milestones: [
        { id: 'ms-1', text: 'Elegir entre ingeniería o maestría', done: true },
        { id: 'ms-2', text: 'Revisar requisitos de inscripción', done: false },
        { id: 'ms-3', text: 'Juntar documentos', done: false },
        { id: 'ms-4', text: 'Presentar examen de admisión', done: false },
        { id: 'ms-5', text: 'Inscribirme', done: false },
      ],
    },
    {
      ...base,
      id: 'goal-dash',
      title: 'Terminar el dashboard',
      area: 'personal',
      kind: 'project',
      status: 'active',
      target: 100,
      current: 62,
      unit: '%',
      dueOn: ctx.day(13),
      why: 'Tener toda mi vida en un solo lugar',
      projectId: PROJECT_ID.dash,
      linkLabel: 'Ver proyecto Dashboard personal',
      linkHref: `/proyectos/${PROJECT_ID.dash}`,
    },
    {
      ...base,
      id: 'goal-vit',
      title: 'Vitaminas el 90% de los días',
      area: 'health',
      kind: 'habit',
      status: 'active',
      target: HABIT_TARGET_PERCENT,
      current: 88,
      unit: '%',
      dueOn: null,
      why: 'Sentirme con más energía',
      blockId: 'vit',
      linkLabel: 'Ver bloque Vitaminas en el reporte',
      linkHref: '/dia-a-dia/reporte',
    },
    {
      ...base,
      id: 'goal-aur',
      title: 'Escribir 50,000 palabras de Auralun',
      area: 'personal',
      kind: 'number',
      status: 'active',
      target: 50000,
      current: 18400,
      unit: 'palabras',
      dueOn: ctx.day(76),
      why: 'Para no dejar Auralun solo en ideas',
      log: [
        { id: 'log-aur-1', date: ctx.day(-12), amount: 1200 },
        { id: 'log-aur-2', date: ctx.day(-16), amount: 800 },
        { id: 'log-aur-3', date: ctx.day(-19), amount: 2100 },
      ],
    },
    {
      ...base,
      id: 'goal-aho',
      title: 'Fondo de emergencia',
      area: 'money',
      kind: 'number',
      status: 'active',
      target: 10000,
      current: 6200,
      unit: '$',
      dueOn: ctx.day(150),
      why: 'Dormir tranquilo si algo pasa',
      log: [
        { id: 'log-aho-1', date: ctx.day(-15), amount: 1000 },
        { id: 'log-aho-2', date: ctx.day(-31), amount: 1000 },
      ],
    },
    {
      ...base,
      id: 'goal-prep',
      title: 'Meal prep 4 semanas seguidas',
      area: 'health',
      kind: 'habit',
      status: 'done',
      target: HABIT_TARGET_PERCENT,
      current: HABIT_TARGET_PERCENT,
      unit: '%',
      dueOn: null,
      achievedOn: ctx.day(-18),
    },
    {
      ...base,
      id: 'goal-cap',
      title: 'Terminar el primer capítulo de Un cuento de amores y dragones',
      area: 'personal',
      kind: 'milestones',
      status: 'done',
      target: 1,
      current: 1,
      unit: '',
      dueOn: null,
      achievedOn: ctx.day(-60),
    },
  ]
}

export function buildDailySeed(ctx: MockContext, weekStart: IsoDate, nowMinutes: number): DailySeed {
  return {
    routines: seedRoutines(),
    blocks: seedBlocks(),
    logs: seedLogs(ctx.today, nowMinutes),
    meals: seedMeals(ctx.today, weekStart, nowMinutes),
    journal: seedJournal(ctx.today),
    goals: seedGoals(ctx),
  }
}

// --- Enfoque --------------------------------------------------------------------------------------

// Las tareas pendientes de cada área o proyecto, que un bloque de enfoque muestra una por una. Sigue de
// ejemplo con la API conectada (decisión #39): Tareas no tiene el concepto de "área" (solo project_id),
// así que filtrar por ahí pediría agregarlo primero — fuera de este alcance.
export const FOCUS_TASKS: Record<string, string[]> = {
  school: ['Revisar requisitos de inscripción', 'Juntar documentos para la ingeniería', 'Comparar fechas de la maestría'],
  work: ['Propuesta de módulos', 'Revisar el flujo del bot con el equipo'],
  personal: ['Diseñar la rutina de Día a día', 'Probar Recordatorios en el celular'],
  [PROJECT_ID.dash]: ['Diseñar la rutina de Día a día', 'Conectar Recordatorios con Inicio'],
  [PROJECT_ID.ing]: ['Revisar requisitos de inscripción', 'Juntar documentos para la ingeniería'],
}

export const FOCUS_AREA_LABEL: Record<string, string> = {
  school: 'Escuela',
  work: 'Trabajo',
  personal: 'Personal',
}

// Lo que el Diario cuenta de hoy fuera de la rutina: tareas hechas y eventos. Debería salir de Tareas y
// Agenda; sigue de ejemplo con la API conectada (decisión #39), igual que FOCUS_TASKS arriba.
export const TODAY_SUMMARY_EXTRAS = ['1 tarea hecha', 'Daily · Partida con amigos']

