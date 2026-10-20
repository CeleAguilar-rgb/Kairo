import { z } from 'zod'

import { timeOfDay } from '../time'

import { SUBJECT_COLORS, WEEKDAYS } from './constants'

const subjectFields = {
  name: z.string().trim().min(1, 'Escribe el nombre de la materia.').max(80, 'Máximo 80 caracteres.'),
  teacher: z.string().trim().max(80, 'Máximo 80 caracteres.').nullable(),
  // Cada día de clase es una serie semanal en Agenda: sin un día no habría dónde anclarla.
  days: z.array(z.enum(WEEKDAYS)).min(1, 'Elige al menos un día de clase.').max(6),
  startsAt: timeOfDay,
  endsAt: timeOfDay,
  room: z.string().trim().max(80, 'Máximo 80 caracteres.'),
  color: z.enum(SUBJECT_COLORS),
}

const endsAfterStarts = (subject: { startsAt: string; endsAt: string }) => subject.endsAt > subject.startsAt
const endsAfterStartsIssue = { path: ['endsAt'], error: 'Debe terminar después de empezar.' }

// Formulario "Nueva materia" (Escuela.dc.html). Se crea como un proyecto de tipo Escuela: sus entregas son
// tareas y sus clases, eventos semanales de Agenda (decisión #43).
export const createSubjectSchema = z.object(subjectFields).refine(endsAfterStarts, endsAfterStartsIssue)

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>

// Lo que recibe la API: el formulario más el periodo al que pertenece la materia (null = sin periodo todavía).
// Lo pone la pantalla (conoce el periodo actual), no la persona en el formulario.
export const createSubjectBodySchema = z
  .object({ ...subjectFields, termId: z.uuid().nullable() })
  .refine(endsAfterStarts, endsAfterStartsIssue)

export type CreateSubjectBodyInput = z.infer<typeof createSubjectBodySchema>

// Una calificación va de 0 a 10 con un decimal; null = todavía sin calificar. La API redondea a un decimal.
const score = z
  .number('Escribe un número del 0 al 10.')
  .min(0, 'La calificación va del 0 al 10.')
  .max(10, 'La calificación va del 0 al 10.')
  .nullable()

// Las calificaciones de una materia se editan una casilla a la vez: solo viaja la que cambió, así que dos
// pestañas abiertas no se pisan entre sí.
export const subjectGradesSchema = z
  .object({ midterm1: score.optional(), midterm2: score.optional(), final: score.optional() })
  .refine((grades) => Object.values(grades).some((value) => value !== undefined), {
    error: 'Manda al menos una calificación.',
  })

export type SubjectGradesInput = z.infer<typeof subjectGradesSchema>

// Formulario "Periodo": el nombre, sus fechas (la cuenta regresiva de "Antes de empezar" cuenta hacia el
// inicio) y, si la hay, el proyecto cuyas tareas son la lista de preparación.
export const termSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe el nombre del periodo.').max(80, 'Máximo 80 caracteres.'),
    startsOn: z.iso.date('Elige cuándo empieza.'),
    endsOn: z.iso.date('Elige cuándo termina.'),
    prepProjectId: z.uuid().nullable(),
  })
  .refine((term) => term.endsOn >= term.startsOn, {
    path: ['endsOn'],
    error: 'Debe terminar después de empezar.',
  })

export type TermInput = z.infer<typeof termSchema>
