import type {
  GoalArea,
  GoalKind,
  GoalStatus,
  JournalTag,
  Meal,
  MoodLevel,
  RoutineIcon,
  RoutineKind,
  RoutineNag,
} from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'

// Tablas routines, routine_blocks + routine_logs, meal_plans, journal_entries y goals de
// docs/guides/data-model.md (camelCase). Lo que el canvas pide y el modelo todavía no tiene está
// anotado en docs/history/sessions/2026-10-16-dia-a-dia-6.md ("Pendiente de base de datos").

export type { GoalArea, GoalKind, GoalStatus, JournalTag, Meal, MoodLevel, RoutineIcon, RoutineKind, RoutineNag }

export const ROUTINE_KIND_LABEL: Record<RoutineKind, string> = {
  habit: 'Hábito',
  meal: 'Comida',
  focus: 'Enfoque',
  free: 'Libre',
}

// La ayuda bajo "Clase" en el editor de bloques (RutinaEditar.dc.html).
export const ROUTINE_KIND_HINT: Record<RoutineKind, string> = {
  habit: 'Se marca con un check, como agua o vitaminas.',
  meal: 'Muestra el platillo que toca hoy según tu menú semanal.',
  focus: 'Muestra tu siguiente tarea pendiente de lo que elijas.',
  free: 'Solo ocupa su espacio en el día; no se marca.',
}

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
}

// --- Rutina ---------------------------------------------------------------------------------------

export type Routine = {
  id: string
  name: string
  // De lunes (0) a domingo (6), sin importar con qué día empiece la semana el perfil.
  days: boolean[]
  active: boolean
}

// Un bloque de una rutina (routine_blocks). Las horas son horas de pared ('HH:MM', columna time): la
// rutina no depende de la zona. `endsAt` es opcional: un hábito es un momento, no un rango.
export type RoutineBlock = {
  id: string
  routineId: string
  startsAt: string
  endsAt: string | null
  title: string
  kind: RoutineKind
  icon: RoutineIcon
  position: number
  // Avisar a la hora del bloque, y cuántos minutos después insistir si no se marcó (0 = no insistir).
  alert: boolean
  nagMinutes: RoutineNag
  countsForReport: boolean
  // Solo el enfoque: de dónde sale la siguiente tarea ('school', 'work', 'personal' o un id de proyecto).
  link: string | null
  // Una línea fija bajo el título ("Sin pantallas desde 22:30").
  note: string | null
}

// Cómo quedó marcado un bloque hoy (routine_logs): a qué hora, y si fue después de que ya se insistió.
export type BlockLog = {
  doneAt: string
  late: boolean
}

export type RoutineBlockToday = RoutineBlock & { log: BlockLog | null }

// La siguiente tarea de un bloque de enfoque y cuántas van hechas hoy en ese bloque.
export type FocusInfo = {
  areaLabel: string
  tasks: string[]
  doneCount: number
}

export type RoutineDay = {
  routine: Routine | null
  blocks: RoutineBlockToday[]
  focus: Record<string, FocusInfo>
}

// Una de las opciones de "Ligado a" de un bloque de enfoque.
export type FocusLink = {
  value: string
  label: string
  // Lo que Hoy mostraría como siguiente tarea.
  preview: string
}

// Una racha (Hoy → "Rachas"): días seguidos que se cumplió un bloque y los últimos 7 días.
export type Streak = {
  blockId: string
  title: string
  days: number
  dots: boolean[]
}

// --- Reporte --------------------------------------------------------------------------------------

// done = a tiempo · late = después del aviso · skipped = el día pasó sin marcarlo · pending = hoy y
// todavía falta · future = ese día aún no llega · off = ese día usa otra rutina.
export type CellStatus = 'done' | 'late' | 'skipped' | 'pending' | 'future' | 'off'

export type ReportCell = {
  date: IsoDate
  status: CellStatus
  // Cuándo se marcó (solo hecho o tarde).
  doneAt: string | null
}

export type ReportRow = {
  blockId: string
  title: string
  startsAt: string
  cells: ReportCell[]
}

export type ReportWeek = {
  weekStart: IsoDate
  rows: ReportRow[]
  // Rutinas activas que no tienen ningún bloque que cuente (el pie del reporte avisa que esos días no aplican).
  emptyRoutines: { name: string; daysText: string }[]
  // Los bloques de la rutina que no cuentan para el reporte ("Trabajo no cuenta").
  uncountedTitles: string[]
}

// --- Menú -----------------------------------------------------------------------------------------

export type MealPlan = {
  id: string
  planDate: IsoDate
  meal: Meal
  dish: string
  done: boolean
  prep: boolean
  note: string | null
  // Hay un evento de la Agenda que cae en esa comida.
  hasEvent: boolean
}

// --- Diario ---------------------------------------------------------------------------------------

export type JournalEntry = {
  id: string
  entryDate: IsoDate
  mood: MoodLevel
  body: string
  gratitude: string[]
  tags: JournalTag[]
  // "Tu día en resumen": lo que se cumplió ese día, guardado al escribir la entrada.
  summary: string[]
  // Momento en que se guardó (ISO, UTC).
  savedAt: string
}

// --- Metas ----------------------------------------------------------------------------------------

export type Milestone = {
  id: string
  text: string
  done: boolean
}

export type GoalLogEntry = {
  id: string
  date: IsoDate
  amount: number
}

export type Goal = {
  id: string
  title: string
  area: GoalArea
  kind: GoalKind
  status: GoalStatus
  // El avance es current / target: hitos hechos de los totales, cantidad sumada, porcentaje del mes en
  // un hábito o porcentaje de un proyecto. Para un logro y un hábito los calcula quien lee los datos.
  target: number
  current: number
  unit: string
  dueOn: IsoDate | null
  why: string
  // Hábito: el bloque de la rutina. Proyecto: el id del proyecto.
  blockId: string | null
  projectId: string | null
  // Una meta ligada muestra a dónde ir ("Ver proyecto Dashboard personal").
  linkLabel: string | null
  linkHref: string | null
  achievedOn: IsoDate | null
  milestones: Milestone[]
  log: GoalLogEntry[]
}
