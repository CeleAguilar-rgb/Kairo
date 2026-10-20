import { WEEKDAYS, type SubjectColor, type Weekday } from '@kairo/shared'

import type { EventRecord } from '@/features/agenda/records'
import type { Task } from '@/features/tasks/types'
import {
  addDays,
  diffDays,
  formatDayMonth,
  minutesToWallTime,
  weekdayOf,
  type IsoDate,
} from '@/lib/dates'

import type {
  Assignment,
  ClassSlot,
  PrepItem,
  Subject,
  SubjectGrades,
  SubjectRecord,
  Term,
} from './types'

// El promedio de una materia: la media de los parciales que ya tiene (Parcial 1, Parcial 2,
// Final), ignorando los que faltan. null si no tiene ninguno todavía.
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

// "Esta semana" = hoy y los próximos 6 días (y lo que ya venció); lo demás, "Después". Una entrega
// sin fecha va al final, aparte.
export function groupAssignments(
  assignments: Assignment[],
  today: IsoDate,
): { name: string; items: Assignment[] }[] {
  const weekEnd = addDays(today, 6)
  const dated = assignments
    .filter((a): a is Assignment & { dueOn: IsoDate } => a.dueOn !== null)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
  return [
    { name: 'Esta semana', items: dated.filter((a) => a.dueOn <= weekEnd) },
    { name: 'Después', items: dated.filter((a) => a.dueOn > weekEnd) },
    { name: 'Sin fecha', items: assignments.filter((a) => a.dueOn === null) },
  ].filter((group) => group.items.length > 0)
}

export function isAssignmentOverdue(
  assignment: Assignment,
  today: IsoDate,
): boolean {
  return (
    !assignment.done && assignment.dueOn !== null && assignment.dueOn < today
  )
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
    for (const slot of subject.classes) {
      const startHour = Math.floor(parseTimeMinutes(slot.startsAt) / 60)
      const endHour = Math.ceil(parseTimeMinutes(slot.endsAt) / 60)
      for (let hour = startHour; hour < endHour; hour++) hourSet.add(hour)
    }
  }
  const hours = [...hourSet].sort((a, b) => a - b)
  const rowIndex = new Map(hours.map((hour, index) => [hour, index]))

  const blocks: ScheduleBlock[] = []
  for (const subject of subjects) {
    for (const slot of subject.classes) {
      const startHour = Math.floor(parseTimeMinutes(slot.startsAt) / 60)
      const endHour = Math.ceil(parseTimeMinutes(slot.endsAt) / 60)
      const rowStart = rowIndex.get(startHour)
      if (rowStart === undefined) continue
      blocks.push({
        subjectId: subject.id,
        name: subject.name,
        color: subject.color,
        dayIndex: weekdayIndex(slot.day),
        rowStart,
        rowSpan: Math.max(1, endHour - startHour),
        meta: slot.room ? `${slot.startsAt} · ${slot.room}` : slot.startsAt,
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

// "Lun y Mié · 19:00": los días de clase y la hora de la primera.
export function scheduleText(
  classes: ClassSlot[],
  dayLabel: Record<Weekday, string>,
): string {
  if (classes.length === 0) return 'Sin horario'
  const days = [...new Set(classes.map((slot) => slot.day))]
    .sort((a, b) => weekdayIndex(a) - weekdayIndex(b))
    .map((day) => dayLabel[day].slice(0, 3))
  const joined =
    days.length > 1 ? `${days.slice(0, -1).join(', ')} y ${days.at(-1)}` : days[0]
  return `${joined} · ${classes[0].startsAt}`
}

// El salón (o enlace) de la materia: el de sus clases, sin repetir.
export function roomsText(classes: ClassSlot[]): string {
  const rooms = [...new Set(classes.map((slot) => slot.room).filter(Boolean))]
  return rooms.join(' · ')
}

// --- Armar la pantalla con lo que devuelven la API de Escuela, Agenda y Tareas (decisión #38) ---

// El periodo que se muestra: el que está en curso; si no hay, el que viene más pronto; si tampoco, el último
// que terminó. null si todavía no hay ninguno.
export function pickCurrentTerm(terms: Term[], today: IsoDate): Term | null {
  const ongoing = terms.find(
    (term) => term.startsOn <= today && today <= term.endsOn,
  )
  if (ongoing) return ongoing
  const upcoming = terms
    .filter((term) => term.startsOn > today)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0]
  if (upcoming) return upcoming
  return [...terms].sort((a, b) => b.endsOn.localeCompare(a.endsOn))[0] ?? null
}

// Las materias del periodo que se muestra, más las que todavía no tienen periodo.
export function visibleSubjects(
  subjects: Subject[],
  term: Term | null,
): Subject[] {
  return subjects.filter(
    (subject) => subject.termId === null || subject.termId === term?.id,
  )
}

// Días que faltan para que empiece el periodo; null si ya empezó o no hay periodo.
export function daysUntilStart(term: Term | null, today: IsoDate): number | null {
  if (!term) return null
  const days = diffDays(today, term.startsOn)
  return days > 0 ? days : null
}

// Las clases de una materia son los eventos semanales de Agenda ligados a su proyecto. Solo lunes a sábado
// (Escuela no tiene domingo) y solo los que tienen hora.
function classesOf(projectId: string, events: EventRecord[]): ClassSlot[] {
  const slots: ClassSlot[] = []
  for (const event of events) {
    if (event.project?.id !== projectId || event.repeat !== 'weekly') continue
    if (event.startMin === null || event.endMin === null) continue
    const weekday = weekdayOf(event.date)
    if (weekday === 0) continue
    slots.push({
      day: WEEKDAYS[weekday - 1],
      startsAt: minutesToWallTime(event.startMin),
      endsAt: minutesToWallTime(event.endMin),
      room: event.place ?? '',
    })
  }
  return slots.sort(
    (a, b) =>
      weekdayIndex(a.day) - weekdayIndex(b.day) ||
      a.startsAt.localeCompare(b.startsAt),
  )
}

export function toSubjects(
  records: SubjectRecord[],
  events: EventRecord[],
): Subject[] {
  return records.map((record) => ({
    ...record,
    classes: classesOf(record.projectId, events),
  }))
}

// Una entrega hecha se queda en la lista un tiempo y luego sale: si no, la lista crecería sin fin.
const DONE_VISIBLE_DAYS = 14

// Las entregas son las tareas (sin subtareas) de los proyectos de las materias que se muestran: las abiertas y las
// que se terminaron hace poco.
export function toAssignments(
  tasks: Task[],
  subjects: Subject[],
  today: IsoDate,
): Assignment[] {
  const subjectByProject = new Map(
    subjects.map((subject) => [subject.projectId, subject]),
  )
  const recentFrom = addDays(today, -DONE_VISIBLE_DAYS)
  const assignments: Assignment[] = []
  for (const task of tasks) {
    const subject = task.project ? subjectByProject.get(task.project.id) : null
    if (!subject) continue
    const done = task.status === 'done'
    if (done && task.doneAt !== null && task.doneAt.slice(0, 10) < recentFrom)
      continue
    assignments.push({
      id: task.id,
      subjectId: subject.id,
      title: task.title,
      kind: null,
      dueOn: task.dueOn,
      done,
    })
  }
  return assignments
}

// "Antes de empezar": las tareas del proyecto de preparación, en el orden de Tareas.
export function toPrepItems(tasks: Task[], prepProjectId: string): PrepItem[] {
  return tasks
    .filter((task) => task.project?.id === prepProjectId)
    .sort((a, b) => a.position - b.position)
    .map((task) => ({
      id: task.id,
      title: task.title,
      done: task.status === 'done',
      note:
        task.status === 'done'
          ? 'Hecho'
          : task.dueOn
            ? formatDayMonth(task.dueOn)
            : '',
    }))
}
