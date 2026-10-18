import type { MockContext } from '@/lib/mock/context'

import type { Assignment, PrepItem, Subject } from './types'

// Las mismas 5 materias de ejemplo de Escuela.dc.html (1er cuatrimestre de
// Ingeniería en Software). Los horarios y profesores son de relleno.
export function buildSubjects(): Subject[] {
  return [
    {
      id: 'cal',
      name: 'Cálculo diferencial',
      teacher: 'Prof. Ramírez',
      color: 'ink',
      days: ['mon', 'wed'],
      startsAt: '19:00',
      endsAt: '21:00',
      room: 'Salón B-204',
      grades: { midterm1: 8.5, midterm2: 8.9, final: null },
    },
    {
      id: 'pro',
      name: 'Programación estructurada',
      teacher: 'Prof. Méndez',
      color: 'lavender',
      days: ['tue', 'thu'],
      startsAt: '19:00',
      endsAt: '21:00',
      room: 'Laboratorio 2',
      grades: { midterm1: 9.6, midterm2: 9.4, final: null },
    },
    {
      id: 'alg',
      name: 'Álgebra lineal',
      teacher: 'Prof. Torres',
      color: 'sand',
      days: ['sat'],
      startsAt: '09:00',
      endsAt: '11:00',
      room: 'En línea',
      grades: { midterm1: 8.0, midterm2: null, final: null },
    },
    {
      id: 'bd',
      name: 'Fundamentos de bases de datos',
      teacher: 'Prof. Aguilar',
      color: 'lavender_soft',
      days: ['sat'],
      startsAt: '11:00',
      endsAt: '13:00',
      room: 'En línea',
      grades: { midterm1: 9.2, midterm2: null, final: null },
    },
    {
      id: 'ing',
      name: 'Inglés I',
      teacher: 'Prof. Smith',
      color: 'peach',
      days: ['wed'],
      startsAt: '21:00',
      endsAt: '22:00',
      room: 'En línea',
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
