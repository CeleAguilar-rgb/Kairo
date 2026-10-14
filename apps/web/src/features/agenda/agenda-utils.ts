import {
  addDays,
  addMonths,
  diffDays,
  formatDayMonth,
  formatLongDay,
  formatMonthYear,
  formatRange,
  formatWallTime,
  formatWeekdayLong,
  minutesToWallTime,
  startOfMonth,
  startOfWeek,
  dayOfMonth,
  type IsoDate,
} from '@/lib/dates'

import type { AgendaEntry, AgendaEntryType } from './types'

// Los cálculos de la pantalla de Agenda como funciones puras (sin React): el componente guarda el estado
// y las llama.

export type AgendaView = 'day' | 'week' | 'month'

// En el orden del panel "Mostrar" del canvas.
export const FILTER_TYPES: AgendaEntryType[] = ['work', 'personal', 'school', 'payment', 'task']

export const TYPE_LABEL: Record<AgendaEntryType, string> = {
  work: 'Trabajo',
  personal: 'Personal',
  school: 'Escuela',
  payment: 'Pagos',
  task: 'Tareas con fecha',
}

// Alto de una hora en la vista de semana y en la de día (px).
export const HOUR_PX = { week: 52, day: 60 } as const

const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 22

export function isTimed(entry: AgendaEntry): entry is AgendaEntry & { startMin: number; endMin: number } {
  return !entry.allDay && entry.startMin !== null && entry.endMin !== null
}

// Las horas que muestra la cuadrícula: de 8 a 22 por defecto, y se estira si algo cae fuera.
export function hourRange(entries: AgendaEntry[]): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR
  let endHour = DEFAULT_END_HOUR
  for (const entry of entries) {
    if (!isTimed(entry)) continue
    startHour = Math.min(startHour, Math.floor(entry.startMin / 60))
    endHour = Math.max(endHour, Math.ceil(entry.endMin / 60))
  }
  return { startHour, endHour: Math.min(endHour, 24) }
}

export type Placed = { entry: AgendaEntry & { startMin: number; endMin: number }; column: number; columns: number }

// Acomoda los eventos con hora de un día: los que se empalman se reparten en columnas lado a lado en
// lugar de taparse. Cada grupo de eventos que se tocan entre sí tiene su propio número de columnas.
export function placeTimed(entries: AgendaEntry[]): Placed[] {
  const timed = entries.filter(isTimed).sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)
  const placed: Placed[] = []
  let cluster: Placed[] = []
  let clusterEnd = -1

  const closeCluster = () => {
    const columns = cluster.reduce((max, item) => Math.max(max, item.column + 1), 1)
    for (const item of cluster) item.columns = columns
    placed.push(...cluster)
    cluster = []
  }

  for (const entry of timed) {
    if (cluster.length > 0 && entry.startMin >= clusterEnd) closeCluster()
    // La primera columna donde cabe: ninguno de los que ya están ahí se empalma con él.
    let column = 0
    while (cluster.some((item) => item.column === column && item.entry.endMin > entry.startMin && item.entry.startMin < entry.endMin)) column++
    cluster.push({ entry, column, columns: 1 })
    clusterEnd = Math.max(clusterEnd, entry.endMin)
  }
  if (cluster.length > 0) closeCluster()
  return placed
}

export type FreeSlot = { startMin: number; endMin: number }

// Los huecos de al menos hora y media entre los eventos del día, desde `fromMin` hasta el final de la
// cuadrícula. Son las franjas punteadas de "Libre de … a …".
export function freeSlots(entries: AgendaEntry[], range: { startHour: number; endHour: number }, fromMin: number): FreeSlot[] {
  const slots: FreeSlot[] = []
  let cursor = Math.max(range.startHour * 60, fromMin)
  const timed = entries.filter(isTimed).sort((a, b) => a.startMin - b.startMin)
  for (const entry of [...timed, { startMin: range.endHour * 60, endMin: range.endHour * 60 }]) {
    if (entry.startMin - cursor >= 90) slots.push({ startMin: cursor, endMin: entry.startMin })
    cursor = Math.max(cursor, entry.endMin)
  }
  return slots
}

// Los siete días de la semana que contiene `anchor`.
export function weekDays(anchor: IsoDate, weekStart: 'monday' | 'sunday'): IsoDate[] {
  const first = startOfWeek(anchor, weekStart)
  return Array.from({ length: 7 }, (_, index) => addDays(first, index))
}

// Los días de la cuadrícula del mes: semanas completas, las del mes anterior y siguiente atenuadas.
export function monthGrid(anchor: IsoDate, weekStart: 'monday' | 'sunday'): IsoDate[] {
  const first = startOfMonth(anchor)
  const start = startOfWeek(first, weekStart)
  const nextMonth = startOfMonth(addMonths(first, 1))
  const weeks = Math.ceil(diffDays(start, nextMonth) / 7)
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index))
}

// Pasa a la vista anterior (-1) o siguiente (1): un día, una semana o un mes.
export function shiftAnchor(anchor: IsoDate, view: AgendaView, step: 1 | -1): IsoDate {
  if (view === 'day') return addDays(anchor, step)
  if (view === 'week') return addDays(anchor, step * 7)
  return addMonths(anchor, step)
}

// Orden dentro de un día: lo de todo el día primero y luego por hora.
export function byTime(a: AgendaEntry, b: AgendaEntry): number {
  return a.date.localeCompare(b.date) || (a.allDay ? -1 : (a.startMin ?? 0)) - (b.allDay ? -1 : (b.startMin ?? 0)) || a.title.localeCompare(b.title)
}

// "11:00 a 11:45", o "Todo el día" / "Pago" / "Fecha límite" para lo que no tiene hora.
export function timeText(entry: AgendaEntry, hourFormat: '12h' | '24h'): string {
  if (isTimed(entry)) {
    const format = (minutes: number) => formatWallTime(minutesToWallTime(minutes), hourFormat)
    return `${format(entry.startMin)} a ${format(entry.endMin)}`
  }
  if (entry.type === 'payment') return 'Pago'
  if (entry.type === 'task') return 'Fecha límite'
  return 'Todo el día'
}

// Solo la hora de inicio ("11:00"), para las listas cortas.
export function startText(entry: AgendaEntry, hourFormat: '12h' | '24h'): string {
  if (isTimed(entry)) return formatWallTime(minutesToWallTime(entry.startMin), hourFormat)
  if (entry.type === 'payment') return 'Pago'
  if (entry.type === 'task') return 'Fecha límite'
  return 'Todo el día'
}

// La etiqueta de una hora entera en el borde izquierdo de la cuadrícula ("08:00", "8 a. m.").
export function hourLabel(hour: number, hourFormat: '12h' | '24h'): string {
  return formatWallTime(`${String(hour).padStart(2, '0')}:00`, hourFormat)
}

// El título grande de la pantalla: "Hoy", "Esta semana", "Octubre".
export function heading(view: AgendaView, anchor: IsoDate, today: IsoDate, weekStart: 'monday' | 'sunday'): string {
  if (view === 'month') return formatMonthYear(anchor).split(' ')[0]
  if (view === 'day') {
    const diff = diffDays(today, anchor)
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Mañana'
    if (diff === -1) return 'Ayer'
    return `${formatWeekdayLong(anchor)} ${dayOfMonth(anchor)}`
  }
  const weeks = diffDays(startOfWeek(today, weekStart), startOfWeek(anchor, weekStart)) / 7
  if (weeks === 0) return 'Esta semana'
  if (weeks === 1) return 'Próxima semana'
  if (weeks === -1) return 'Semana pasada'
  return `Semana del ${dayOfMonth(startOfWeek(anchor, weekStart))}`
}

// El renglón bajo el título: "Miércoles 14 de octubre · 4 cosas", "12 al 18 de octubre", "Octubre de 2026".
export function rangeLabel(view: AgendaView, anchor: IsoDate, weekStart: 'monday' | 'sunday', count: number): string {
  if (view === 'day') return `${formatLongDay(anchor)} · ${count} ${count === 1 ? 'cosa' : 'cosas'}`
  if (view === 'week') {
    const days = weekDays(anchor, weekStart)
    return formatRange(days[0], days[6])
  }
  return formatMonthYear(anchor)
}

// "Miércoles 14 de octubre" para el panel de detalle.
export function dayLabel(date: IsoDate): string {
  return formatLongDay(date)
}

// "14 de octubre" (corto) para textos pequeños.
export function shortDayLabel(date: IsoDate): string {
  return formatDayMonth(date)
}

// Los sitios de llamadas que se reconocen en "Lugar o enlace" para mostrar el botón "Unirme a la
// llamada". Se compara el DOMINIO (no un pedazo del texto) para que un enlace cualquiera no se haga pasar
// por una llamada.
const MEETING_HOSTS = ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'teams.live.com']

// La dirección (https) de una llamada si el lugar es un enlace de Meet, Zoom o Teams; null si no.
export function meetingUrl(place: string | null): string | null {
  if (!place) return null
  const text = place.trim()
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const host = url.hostname.toLowerCase()
    return MEETING_HOSTS.some((meeting) => host === meeting || host.endsWith(`.${meeting}`)) ? url.toString() : null
  } catch {
    return null
  }
}
