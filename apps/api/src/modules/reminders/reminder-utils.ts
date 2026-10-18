import type { ReminderRepeat, ReminderSnooze } from '@kairo/shared'

// Lógica pura de fechas que ya existe en apps/web/src/lib/dates.ts (zonedToUtc,
// todayIn, addDays, weekdayOf): se duplica aquí, mínima, porque la API no
// puede importar el alias '@/lib/...' del front y packages/shared no trae
// fechas todavía (moverlo ahí tocaría muchas pantallas que ya lo usan). Si
// esto crece, es momento de compartirlo de verdad.

export type IsoDate = string

const TOMORROW_AT = '09:00'

export function todayIn(timeZone: string, now = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function dateOfMoment(iso: string, timeZone: string): IsoDate {
  return todayIn(timeZone, new Date(iso))
}

// date siempre es 'AAAA-MM-DD' (IsoDate, regla 8 de CLAUDE.md): el pipe
// .split('-').map(Number) deja 3 números por construcción, pero
// noUncheckedIndexedAccess los tipa opcionales igual. Centralizarlo aquí
// evita repetir la afirmación de no-null en cada función.
function parseIsoDate(date: IsoDate): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number)
  return [y!, m!, d!]
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = parseIsoDate(date)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function weekdayOf(date: IsoDate): number {
  const [y, m, d] = parseIsoDate(date)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function formatTime24h(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
}

function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - utcMs
}

// Un día suelto + hora de pared en una zona → ISO en UTC. Antes vivía en el
// Next.js de en medio (lib/dates.ts: "cuando exista la API, esto lo resuelve
// el servidor"); ya existe, así que se mudó aquí.
export function zonedToUtc(date: IsoDate, time: string, timeZone: string): string {
  const [y, m, d] = parseIsoDate(date)
  const [hh, mm] = time.split(':').map(Number)
  const wallAsUtc = Date.UTC(y, m - 1, d, hh ?? 0, mm ?? 0)
  let guess = wallAsUtc - offsetMs(wallAsUtc, timeZone)
  guess = wallAsUtc - offsetMs(guess, timeZone)
  return new Date(guess).toISOString()
}

// Cuándo toca la siguiente vez de un recordatorio que se repite (null si es
// de una sola vez). Mismo criterio que reminder-utils.ts del front: cuenta
// desde hoy aunque viniera atrasado, y "Lunes a viernes" se salta el finde.
export function nextOccurrence(remindAt: string, repeat: ReminderRepeat, today: IsoDate, timeZone: string): string | null {
  if (repeat === 'none') return null
  const time = formatTime24h(remindAt, timeZone)
  let day = dateOfMoment(remindAt, timeZone)
  if (day < today) day = today
  do {
    day = addDays(day, 1)
  } while (repeat === 'weekdays' && (weekdayOf(day) === 0 || weekdayOf(day) === 6))
  return zonedToUtc(day, time, timeZone)
}

// A qué hora vuelve a avisar un recordatorio pospuesto.
export function snoozeTarget(option: ReminderSnooze, nowIso: string, timeZone: string): string {
  const now = Date.parse(nowIso)
  if (option === '10m') return new Date(now + 10 * 60_000).toISOString()
  if (option === '1h') return new Date(now + 60 * 60_000).toISOString()
  return zonedToUtc(addDays(todayIn(timeZone, new Date(now)), 1), TOMORROW_AT, timeZone)
}
