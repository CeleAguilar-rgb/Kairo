import type { Weekday } from '@kairo/shared'

import type { MockContext } from '@/lib/mock/context'

import type { Assignment, ClassSlot, PrepItem, ProjectRef, Subject, Term } from './types'

// Las mismas 5 materias de ejemplo de Escuela.dc.html (1er cuatrimestre de Ingeniería en Software). Los
// horarios y profesores son de relleno. Solo las usa el modo demo (lib/demo.ts): con la API, las materias salen
// de /school/subjects y sus clases de los eventos de Agenda.
function classesOf(days: Weekday[], startsAt: string, endsAt: string, room: string): ClassSlot[] {
  return days.map((day) => ({ day, startsAt, endsAt, room }))
}

export function buildSubjects(): Subject[] {
  return [
    {
      id: 'cal',
      projectId: 'cal',
      termId: 'term',
      name: 'Cálculo diferencial',
      teacher: 'Prof. Ramírez',
      color: 'ink',
      classes: classesOf(['mon', 'wed'], '19:00', '21:00', 'Salón B-204'),
      grades: { midterm1: 8.5, midterm2: 8.9, final: null },
    },
    {
      id: 'pro',
      projectId: 'pro',
      termId: 'term',
      name: 'Programación estructurada',
      teacher: 'Prof. Méndez',
      color: 'lavender',
      classes: classesOf(['tue', 'thu'], '19:00', '21:00', 'Laboratorio 2'),
      grades: { midterm1: 9.6, midterm2: 9.4, final: null },
    },
    {
      id: 'alg',
      projectId: 'alg',
      termId: 'term',
      name: 'Álgebra lineal',
      teacher: 'Prof. Torres',
      color: 'sand',
      classes: classesOf(['sat'], '09:00', '11:00', 'En línea'),
      grades: { midterm1: 8.0, midterm2: null, final: null },
    },
    {
      id: 'bd',
      projectId: 'bd',
      termId: 'term',
      name: 'Fundamentos de bases de datos',
      teacher: 'Prof. Aguilar',
      color: 'lavender_soft',
      classes: classesOf(['sat'], '11:00', '13:00', 'En línea'),
      grades: { midterm1: 9.2, midterm2: null, final: null },
    },
    {
      id: 'ing',
      projectId: 'ing-ingles',
      termId: 'term',
      name: 'Inglés I',
      teacher: 'Prof. Smith',
      color: 'peach',
      classes: classesOf(['wed'], '21:00', '22:00', 'En línea'),
      grades: { midterm1: null, midterm2: null, final: null },
    },
  ]
}

// Las entregas, con fecha relativa a hoy (ctx.day) para que siempre se vea viva:
// unas caen en "Esta semana" y otras en "Después" sin importar cuándo se abra la app.
export function buildAssignments(ctx: MockContext): Assignment[] {
  return [
    {
      id: 'e1',
      subjectId: 'cal',
      title: 'Ejercicios de límites',
      kind: 'task',
      dueOn: ctx.day(2),
      done: false,
    },
    {
      id: 'e2',
      subjectId: 'pro',
      title: 'Proyecto 1: calculadora',
      kind: 'project',
      dueOn: ctx.day(5),
      done: false,
    },
    {
      id: 'e3',
      subjectId: 'bd',
      title: 'Modelo entidad-relación',
      kind: 'task',
      dueOn: ctx.day(-1),
      done: false,
    },
    {
      id: 'e4',
      subjectId: 'alg',
      title: 'Examen parcial 1',
      kind: 'exam',
      dueOn: ctx.day(10),
      done: false,
    },
    {
      id: 'e5',
      subjectId: 'pro',
      title: 'Lectura capítulo 2',
      kind: 'reading',
      dueOn: ctx.day(13),
      done: false,
    },
  ]
}

export function buildPrepItems(): PrepItem[] {
  return [
    {
      id: 'p0',
      title: 'Elegir entre ingeniería o maestría',
      done: true,
      note: 'Hecho',
    },
    {
      id: 'p1',
      title: 'Revisar requisitos de inscripción',
      done: false,
      note: '14 oct',
    },
    { id: 'p2', title: 'Juntar documentos', done: false, note: 'nov' },
    {
      id: 'p3',
      title: 'Presentar examen de admisión',
      done: false,
      note: 'dic',
    },
    { id: 'p4', title: 'Inscribirme', done: false, note: 'ene' },
  ]
}

// Días para la cuenta regresiva de "Antes de empezar" (daysLeft del canvas, fijo).
export const PREP_DAYS_LEFT = 85

export const PREP_PROJECT: ProjectRef = { id: 'ing', name: 'Ingeniería o maestría' }

export function buildTerm(ctx: MockContext): Term {
  return {
    id: 'term',
    name: 'Ingeniería en Software · 1er cuatrimestre',
    startsOn: ctx.day(PREP_DAYS_LEFT),
    endsOn: ctx.day(PREP_DAYS_LEFT + 90),
    prepProject: PREP_PROJECT,
  }
}
