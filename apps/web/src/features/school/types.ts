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

export type GradeField = keyof SubjectGrades

export type ProjectRef = { id: string; name: string }

// Una clase de la semana: el día, la hora y el salón. Sale de un evento semanal de Agenda ligado al proyecto
// de la materia (decisión #43): la API no las devuelve, las arma school-utils.ts con la lista de eventos.
export type ClassSlot = {
  day: Weekday
  startsAt: string // 'HH:mm'
  endsAt: string
  room: string
}

export type Subject = {
  id: string
  // La materia es un proyecto de tipo Escuela: sus tareas y sus eventos cuelgan de este id.
  projectId: string
  termId: string | null
  name: string
  teacher: string | null
  color: SubjectColor
  classes: ClassSlot[]
  grades: SubjectGrades
}

// Lo que devuelve GET /v1/school/subjects: la materia sin sus clases.
export type SubjectRecord = Omit<Subject, 'classes'>

// El periodo (cuatrimestre, semestre…): sus fechas mandan la cuenta regresiva de "Antes de empezar" y
// `prepProject` es el proyecto cuyas tareas son la lista de preparación.
export type Term = {
  id: string
  name: string
  startsOn: IsoDate
  endsOn: IsoDate
  prepProject: ProjectRef | null
}

// Una entrega es una tarea del proyecto de la materia. `kind` (tarea, proyecto, examen, lectura) solo existe en
// los datos de ejemplo: Tareas todavía no tiene tipo, así que con la API es null y no se muestra.
export type Assignment = {
  id: string
  subjectId: string
  title: string
  kind: AssignmentKind | null
  dueOn: IsoDate | null
  done: boolean
}

export type PrepItem = {
  id: string
  title: string
  done: boolean
  // Lo que se ve a la derecha: "Hecho", la fecha de la tarea ("14 de octubre") o nada.
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

export const GRADE_LABEL: Record<GradeField, string> = {
  midterm1: 'Parcial 1',
  midterm2: 'Parcial 2',
  final: 'Final',
}
