import type { AssignmentKind, SubjectColor, Weekday } from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'

export type SchoolMode = 'prep' | 'term'
export type SchoolTab = 'schedule' | 'subjects' | 'assignments' | 'grades'

// Los tres parciales de una materia (0-10). null = todavía sin calificar.
export type SubjectGrades = {
  midterm1: number | null
  midterm2: number | null
  final: number | null
}

export type Subject = {
  id: string
  name: string
  teacher: string | null
  color: SubjectColor
  days: Weekday[]
  startsAt: string // 'HH:mm'
  endsAt: string
  room: string
  grades: SubjectGrades
}

export type Assignment = {
  id: string
  subjectId: string
  title: string
  kind: AssignmentKind
  dueOn: IsoDate
  done: boolean
}

export type PrepItem = {
  id: string
  title: string
  done: boolean
  // Fecha o estado en texto libre ("14 oct", "nov", "Hecho") — el canvas no modela una fecha real aquí.
  note: string
}

export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  task: 'Tarea',
  project: 'Proyecto',
  exam: 'Examen',
  reading: 'Lectura',
}

export const SUBJECT_COLOR_LABEL: Record<SubjectColor, string> = {
  lavender: 'Lavanda',
  ink: 'Tinta',
  sand: 'Arena',
  lavender_soft: 'Lavanda suave',
  peach: 'Durazno',
}

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  mon: 'L',
  tue: 'M',
  wed: 'M',
  thu: 'J',
  fri: 'V',
  sat: 'S',
}

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
}
