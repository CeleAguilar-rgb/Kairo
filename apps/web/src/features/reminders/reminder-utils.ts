import { addDays, dateOfMoment, formatDuration, formatRelativeDay, formatTime, todayIn, weekdayOf, zonedToUtc, type IsoDate } from '@/lib/dates'

import type { Reminder, ReminderSnooze, ReminderSource } from './types'

// Lógica pura de Recordatorios (sin servidor ni React): la usan las acciones de servidor, la pantalla
// y la tarjeta de Inicio. Todo "ahora" entra como argumento (un ISO) para que sea predecible.

// A qué hora vuelve a avisar un recordatorio pospuesto "para mañana".
const TOMORROW_AT = '09:00'

// Cuándo le toca avisar: la hora a la que se pospuso, o la suya.
export function effectiveAt(reminder: Reminder): string {
  return reminder.snoozedTo ?? reminder.remindAt
}

const byTime = (a: Reminder, b: Reminder) => effectiveAt(a).localeCompare(effectiveAt(b))

// Los pendientes en dos grupos: lo de hoy (incluye lo que ya pasó y no se atendió: "lo no atendido
// pasa al día siguiente", así que sigue en la lista de hoy) y lo que viene después. Cada uno, por hora.
export function splitByDay(reminders: Reminder[], today: IsoDate, timeZone: string): { today: Reminder[]; later: Reminder[] } {
  const sorted = [...reminders].sort(byTime)
  return {
    today: sorted.filter((reminder) => dateOfMoment(effectiveAt(reminder), timeZone) <= today),
    later: sorted.filter((reminder) => dateOfMoment(effectiveAt(reminder), timeZone) > today),
  }
}

// ¿Ya pasó su hora? Con hora exacta (o pospuesto) cuenta el minuto; si es de "todo el día" o de un
// mes, hasta que termine el día.
export function isLate(reminder: Reminder, nowIso: string, today: IsoDate, timeZone: string): boolean {
  const at = effectiveAt(reminder)
  const exact = reminder.snoozedTo !== null || reminder.precision === 'time'
  return exact ? at < nowIso : dateOfMoment(at, timeZone) < today
}

export type WhenContext = { nowIso: string; today: IsoDate; timeZone: string; hourFormat: '12h' | '24h' }

// El renglón de cuándo, dentro de la lista de "Para hoy" y de "Más adelante":
//   "9:00 · hace 40 min", "10:20", "Todo el día", "Pospuesto · 10:30", "Viernes, 17:00", "Noviembre".
export function whenLabel(reminder: Reminder, context: WhenContext): string {
  const { nowIso, today, timeZone, hourFormat } = context
  const at = effectiveAt(reminder)
  const day = dateOfMoment(at, timeZone)
  const time = formatTime(at, timeZone, hourFormat)
  const clock = day === today ? time : `${formatRelativeDay(day, today)}, ${time}`

  if (reminder.snoozedTo) return `Pospuesto · ${clock}`
  if (reminder.precision === 'month') return monthName(at, timeZone)
  if (reminder.precision === 'day') return day === today ? 'Todo el día' : formatRelativeDay(day, today)

  const minutesAgo = Math.round((Date.parse(nowIso) - Date.parse(at)) / 60_000)
  if (day === today && minutesAgo >= 1) return `${time} · hace ${formatDuration(minutesAgo)}`
  return clock
}

// "El siguiente aviso es a las 14:00: Comer." — lo que se dice cuando ya no queda nada para hoy.
export function nextReminderText(next: Reminder | undefined, context: WhenContext): string {
  if (!next) return 'No hay más avisos por ahora.'
  const { today, timeZone, hourFormat } = context
  const at = effectiveAt(next)
  const day = dateOfMoment(at, timeZone)
  const time = formatTime(at, timeZone, hourFormat)

  let phrase: string
  if (next.precision === 'month') phrase = `en ${monthName(at, timeZone).toLowerCase()}`
  else {
    const relative = formatRelativeDay(day, today)
    const dayPhrase = relative === 'Hoy' || relative === 'Mañana' ? relative.toLowerCase() : `el ${relative.charAt(0).toLowerCase()}${relative.slice(1)}`
    phrase = next.precision === 'day' ? dayPhrase : day === today ? `a las ${time}` : `${dayPhrase} a las ${time}`
  }
  return `El siguiente aviso es ${phrase}: ${next.title}.`
}

// El chip del origen: "Manual · cada día", "Evento · Daily", "Membresía · ••4417", "Rutina de mañana".
export function sourceText(source: ReminderSource, repeat: Reminder['repeat']): string {
  switch (source.kind) {
    case 'manual':
      return repeat === 'daily' ? 'Manual · cada día' : repeat === 'weekdays' ? 'Manual · lun a vie' : 'Manual'
    case 'routine':
      return source.label
    case 'event':
      return `Evento · ${source.label}`
    case 'membership':
      return `Membresía · ${source.label}`
    case 'task':
      return `Tarea · ${source.label}`
  }
}

// El momento al que se pospone: ahora + 10 min, ahora + 1 h, o mañana a las 9 en la zona del perfil.
export function snoozeTarget(option: ReminderSnooze, nowIso: string, timeZone: string): string {
  const now = Date.parse(nowIso)
  if (option === '10m') return new Date(now + 10 * 60_000).toISOString()
  if (option === '1h') return new Date(now + 60 * 60_000).toISOString()
  return zonedToUtc(addDays(todayIn(timeZone, new Date(now)), 1), TOMORROW_AT, timeZone)
}

// Cuándo toca la siguiente vez de un recordatorio que se repite (null si es de una sola vez). Cuenta
// desde hoy aunque el recordatorio viniera atrasado: si se atiende hoy, la próxima es después de hoy.
// "Lunes a viernes" se salta el fin de semana.
export function nextOccurrence(reminder: Reminder, today: IsoDate, timeZone: string): string | null {
  if (reminder.repeat === 'none') return null
  const time = formatTime(reminder.remindAt, timeZone, '24h')
  let day = dateOfMoment(reminder.remindAt, timeZone)
  if (day < today) day = today
  do {
    day = addDays(day, 1)
  } while (reminder.repeat === 'weekdays' && (weekdayOf(day) === 0 || weekdayOf(day) === 6))
  return zonedToUtc(day, time, timeZone)
}

// ¿Esa fecha y hora ya pasaron? Para no dejar crear un recordatorio que nacería atrasado.
export function isInPast(date: IsoDate, time: string, nowIso: string, timeZone: string): boolean {
  return zonedToUtc(date, time, timeZone) <= nowIso
}

function monthName(iso: string, timeZone: string): string {
  const name = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone }).format(new Date(iso))
  return name.charAt(0).toUpperCase() + name.slice(1)
}
