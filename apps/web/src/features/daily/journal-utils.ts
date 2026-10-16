import { addDays, daysInMonth, startOfMonth, weekdayOf, type IsoDate } from '@/lib/dates'

import type { JournalEntry, MoodLevel } from './types'

// Lógica pura del Diario (sin React ni servidor).

export type CalendarCell = {
  date: IsoDate
  day: number
  mood: MoodLevel | null
  isToday: boolean
  isFuture: boolean
}

// El mes de `today` como cuadrícula de semanas: `null` son los huecos antes del día 1 y después del último.
// Los huecos de adelante dependen del día en que empieza la semana en el perfil.
export function monthCalendar(today: IsoDate, entries: Pick<JournalEntry, 'entryDate' | 'mood'>[], weekStart: 'monday' | 'sunday'): (CalendarCell | null)[] {
  const first = startOfMonth(today)
  const moodByDate = new Map(entries.map((entry) => [entry.entryDate, entry.mood]))
  const leading = (weekdayOf(first) - (weekStart === 'monday' ? 1 : 0) + 7) % 7

  const cells: (CalendarCell | null)[] = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= daysInMonth(first); day += 1) {
    const date = addDays(first, day - 1)
    cells.push({ date, day, mood: moodByDate.get(date) ?? null, isToday: date === today, isFuture: date > today })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// El ánimo promedio del mes, redondeado a una de las cinco caritas (null si no hay entradas).
export function averageMood(moods: MoodLevel[]): MoodLevel | null {
  if (moods.length === 0) return null
  const average = moods.reduce<number>((sum, mood) => sum + mood, 0) / moods.length
  return Math.round(average) as MoodLevel
}

// Las iniciales de los días de la semana de la cuadrícula, según con qué día empieza el perfil.
export function calendarWeekdays(weekStart: 'monday' | 'sunday'): string[] {
  const monday = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return weekStart === 'monday' ? monday : ['D', ...monday.slice(0, 6)]
}
