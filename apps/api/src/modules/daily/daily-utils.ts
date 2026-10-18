// Lógica pura de fechas y de la regla de "tarde" que ya existe en apps/web/src/lib/dates.ts y
// features/daily/routine-utils.ts: se duplica aquí, mínima (mismo motivo que reminder-utils.ts y
// agenda-utils.ts). El cálculo de reporte/rachas/metas sigue viviendo en el Next.js de en medio (decisión
// #37 aplicada aquí también): la API solo decide la hora y si una marca fue tarde, y persiste/devuelve
// hechos crudos.

export type IsoDate = string

function parseIsoDate(date: IsoDate): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number)
  return [y!, m!, d!]
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = parseIsoDate(date)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  const [fy, fm, fd] = parseIsoDate(from)
  const [ty, tm, td] = parseIsoDate(to)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

export function weekdayOf(date: IsoDate): number {
  const [y, m, d] = parseIsoDate(date)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

// 0 = lunes … 6 = domingo: el índice de routines.days, igual que mondayIndex en routine-utils.ts.
export function mondayIndex(date: IsoDate): number {
  return (weekdayOf(date) + 6) % 7
}

export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`
}

// Lunes de la semana de `date`, sin importar el week_start del perfil (repeatMealWeekdaysAction siempre
// reparte lunes a viernes, igual que hoy en el front).
export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, -mondayIndex(date))
}

export function todayIn(timeZone: string, now = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// Minutos desde medianoche, ahora mismo, en la zona del perfil.
export function nowMinutesIn(timeZone: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

// Postgres devuelve una columna time como 'HH:MM:SS' (con segundos); el front siempre espera 'HH:MM'
// (RoutineBlock.startsAt, BlockLog.doneAt — ninguna hora de Día a día usa segundos).
export function toWallTime(time: string): string {
  return time.slice(0, 5)
}

export function wallTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

// 1050 → '17:30' (el inverso de wallTimeToMinutes).
export function minutesToWallTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

type BlockTiming = { startsAt: string; endsAt: string | null; nagMinutes: number }

// Un bloque sin insistir y sin hora de fin se considera "a tiempo" 30 minutos (DEFAULT_GRACE_MINUTES en
// routine-utils.ts del front, misma regla — decisión #29).
const DEFAULT_GRACE_MINUTES = 30

function endMinutes(block: BlockTiming): number {
  return wallTimeToMinutes(block.endsAt ?? block.startsAt)
}

export function lateFromMinutes(block: BlockTiming): number {
  if (block.nagMinutes > 0) return wallTimeToMinutes(block.startsAt) + block.nagMinutes
  return block.endsAt ? endMinutes(block) : wallTimeToMinutes(block.startsAt) + DEFAULT_GRACE_MINUTES
}

export function isLateMark(block: BlockTiming, nowMinutes: number): boolean {
  return nowMinutes >= lateFromMinutes(block)
}

export function routineAppliesOn(routine: { days: boolean[]; active: boolean }, date: IsoDate): boolean {
  return routine.active && routine.days[mondayIndex(date)] === true
}
