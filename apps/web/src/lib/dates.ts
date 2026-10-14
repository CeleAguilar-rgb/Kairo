// Fechas de Kairo (regla 8 de CLAUDE.md):
// - Un "día suelto" (due_on, plan_date) es un string 'AAAA-MM-DD' sin zona.
// - Un "momento" (starts_at, remind_at) es un ISO en UTC.
// - Todo se MUESTRA en la zona horaria del perfil (profile.timezone).
// La aritmética de días se hace con los strings, en UTC, para que un cambio de
// horario (o la zona del servidor) nunca mueva un día de lugar.

export type IsoDate = string // 'AAAA-MM-DD'

const LOCALE = 'es-MX'

export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const

// El día de hoy en la zona horaria del perfil, no en la del servidor.
export function todayIn(timeZone: string, now = new Date()): IsoDate {
  // 'en-CA' formatea como AAAA-MM-DD, justo lo que necesitamos.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// Minutos desde la medianoche en la zona del perfil (para saber qué bloque de rutina va "ahora").
export function minutesNowIn(timeZone: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000)
}

// 0 = domingo … 6 = sábado
export function weekdayOf(date: IsoDate): number {
  return new Date(toUtcMs(date)).getUTCDay()
}

// Lunes (o domingo, según profiles.week_start) de la semana que contiene `date`.
export function startOfWeek(date: IsoDate, weekStart: 'monday' | 'sunday'): IsoDate {
  const weekday = weekdayOf(date)
  const back = weekStart === 'monday' ? (weekday + 6) % 7 : weekday
  return addDays(date, -back)
}

export function dayOfMonth(date: IsoDate): number {
  return Number(date.slice(8, 10))
}

// "8 de octubre"
export function formatDayMonth(date: IsoDate): string {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(toUtcMs(date))
}

// "oct"
export function formatMonthShort(date: IsoDate): string {
  return new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' }).format(toUtcMs(date)).replace('.', '')
}

// "Jueves 8 de octubre"
export function formatLongDay(date: IsoDate): string {
  const text = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(toUtcMs(date))
  return capitalize(text.replace(',', ''))
}

// "5 al 11 de octubre" (o "29 de sep. al 5 de octubre" si cruza de mes)
export function formatRange(from: IsoDate, to: IsoDate): string {
  if (from.slice(0, 7) === to.slice(0, 7)) return `${dayOfMonth(from)} al ${formatDayMonth(to)}`
  return `${formatDayMonth(from)} al ${formatDayMonth(to)}`
}

// Un día suelto contado desde hoy: "Hoy", "Mañana", "Ayer", "Viernes", "15 de octubre".
export function formatRelativeDay(date: IsoDate, today: IsoDate): string {
  const diff = diffDays(today, date)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 1 && diff < 7) return capitalize(new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: 'UTC' }).format(toUtcMs(date)))
  return formatDayMonth(date)
}

// La fecha límite de una tarea como en el canvas: "Hoy", "Mañana", "Ayer", "Vie 16" (dentro de la
// semana) o "6 oct". Sin fecha: "Sin fecha". La usan Tareas y Proyectos, por eso vive aquí.
export function formatDueLabel(dueOn: IsoDate | null, today: IsoDate, weekEnd: IsoDate): string {
  if (!dueOn) return 'Sin fecha'
  const diff = diffDays(today, dueOn)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 0 && dueOn <= weekEnd) return `${WEEKDAYS_SHORT[weekdayOf(dueOn)]} ${dayOfMonth(dueOn)}`
  return `${dayOfMonth(dueOn)} ${formatMonthShort(dueOn)}`
}

// La hora de un momento en la zona del perfil: "17:00" o "5:00 p. m." según profiles.hour_format.
export function formatTime(iso: string, timeZone: string, hourFormat: '12h' | '24h' = '24h'): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: hourFormat === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hourCycle: hourFormat === '24h' ? 'h23' : 'h12',
  }).format(new Date(iso))
}

// El día (AAAA-MM-DD) en que cae un momento, visto desde la zona del perfil.
export function dateOfMoment(iso: string, timeZone: string): IsoDate {
  return todayIn(timeZone, new Date(iso))
}

// Un momento a partir de un día + hora "de pared" en una zona: '2026-10-14' +
// '17:00' en America/Mexico_City → ISO en UTC. Lo usan los datos de ejemplo;
// cuando exista la API, esto lo resuelve el servidor.
export function zonedToUtc(date: IsoDate, time: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm)
  // Dos pasadas: la primera estimación del desfase puede caer del otro lado de un cambio de horario.
  let guess = wallAsUtc - offsetMs(wallAsUtc, timeZone)
  guess = wallAsUtc - offsetMs(guess, timeZone)
  return new Date(guess).toISOString()
}

// Minutos entre dos momentos (duración de un evento).
export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000)
}

// "45 min", "2 h", "1 h 30 min"
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
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

function toUtcMs(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Una hora de pared ('17:00', columna time) en el formato del perfil: "17:00" o "5:00 p. m.".
export function formatWallTime(time: string, hourFormat: '12h' | '24h' = '24h'): string {
  if (hourFormat === '24h') return time
  const [h, m] = time.split(':').map(Number)
  const suffix = h < 12 ? 'a. m.' : 'p. m.'
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`
}

// '17:30' → 1050
export function wallTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// 1050 → '17:30' (el inverso de wallTimeToMinutes)
export function minutesToWallTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Cuántos días tiene el mes de un día (28 a 31).
export function daysInMonth(date: IsoDate): number {
  const [y, m] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

// El primer día del mes de un día.
export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`
}

// Suma meses a un día y ajusta el día si el mes nuevo es más corto (31 de enero + 1 mes = 28 de febrero).
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number)
  const index = y * 12 + (m - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12 + 12) % 12
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(d, last))).toISOString().slice(0, 10)
}

// "Octubre de 2026"
export function formatMonthYear(date: IsoDate): string {
  return capitalize(new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(toUtcMs(date)))
}

// "Jueves"
export function formatWeekdayLong(date: IsoDate): string {
  return capitalize(new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: 'UTC' }).format(toUtcMs(date)))
}
