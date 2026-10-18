import { WEEKDAYS, type SubjectColor, type Weekday } from '@kairo/shared'

import { addDays, type IsoDate } from '@/lib/dates'

import type { Assignment, Subject, SubjectGrades } from './types'

// El promedio de una materia: la media de los parciales que ya tiene (Parcial 1,
// Parcial 2, Final), ignorando los que faltan. null si no tiene ninguno todavía.
export function subjectAverage(grades: SubjectGrades): number | null {
  const values = [grades.midterm1, grades.midterm2, grades.final].filter(
    (v): v is number => v !== null,
  )
  if (values.length === 0) return null
  return (
    Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) /
    10
  )
}

// El promedio general: la media de los promedios de las materias que ya tienen uno.
export function overallAverage(subjects: Subject[]): number | null {
  const averages = subjects
    .map((subject) => subjectAverage(subject.grades))
    .filter((v): v is number => v !== null)
  if (averages.length === 0) return null
  return (
    Math.round(
      (averages.reduce((sum, v) => sum + v, 0) / averages.length) * 10,
    ) / 10
  )
}

export function formatGrade(value: number | null): string {
  return value === null ? '—' : value.toFixed(1)
}

// "Esta semana" = hoy y los próximos 6 días; lo demás, "Después".
export function groupAssignments(
  assignments: Assignment[],
  today: IsoDate,
): { name: string; items: Assignment[] }[] {
  const weekEnd = addDays(today, 6)
  const sorted = [...assignments].sort((a, b) => a.dueOn.localeCompare(b.dueOn))
  return [
    { name: 'Esta semana', items: sorted.filter((a) => a.dueOn <= weekEnd) },
    { name: 'Después', items: sorted.filter((a) => a.dueOn > weekEnd) },
  ].filter((group) => group.items.length > 0)
}

export function isAssignmentOverdue(
  assignment: Assignment,
  today: IsoDate,
): boolean {
  return !assignment.done && assignment.dueOn < today
}

function parseTimeMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export type ScheduleBlock = {
  subjectId: string
  name: string
  color: SubjectColor
  dayIndex: number
  rowStart: number
  rowSpan: number
  meta: string
}

// El horario semanal como cuadrícula: solo las horas que de verdad tienen clase
// (como Escuela.dc.html, que no dibuja la tarde vacía entre la mañana y la noche).
export function buildScheduleGrid(subjects: Subject[]): {
  hours: number[]
  blocks: ScheduleBlock[]
} {
  const hourSet = new Set<number>()
  for (const subject of subjects) {
    const startHour = Math.floor(parseTimeMinutes(subject.startsAt) / 60)
    const endHour = Math.ceil(parseTimeMinutes(subject.endsAt) / 60)
    for (let hour = startHour; hour < endHour; hour++) hourSet.add(hour)
  }
  const hours = [...hourSet].sort((a, b) => a - b)
  const rowIndex = new Map(hours.map((hour, index) => [hour, index]))

  const blocks: ScheduleBlock[] = []
  for (const subject of subjects) {
    const startHour = Math.floor(parseTimeMinutes(subject.startsAt) / 60)
    const endHour = Math.ceil(parseTimeMinutes(subject.endsAt) / 60)
    const rowStart = rowIndex.get(startHour)
    if (rowStart === undefined) continue
    for (const day of subject.days) {
      blocks.push({
        subjectId: subject.id,
        name: subject.name,
        color: subject.color,
        dayIndex: weekdayIndex(day),
        rowStart,
        rowSpan: Math.max(1, endHour - startHour),
        meta: `${subject.startsAt} · ${subject.room}`,
      })
    }
  }
  return { hours, blocks }
}

function weekdayIndex(day: Weekday): number {
  return WEEKDAYS.indexOf(day)
}

export function formatHour(hour: number): string {
  return `${hour}:00`
}
