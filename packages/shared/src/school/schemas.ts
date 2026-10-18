import { z } from 'zod'

import { timeOfDay } from '../time'

import { SUBJECT_COLORS, WEEKDAYS } from './constants'

// Formulario "Nueva materia" (Escuela.dc.html). Se crea como un proyecto de tipo
// Escuela: sus entregas son tareas y sus clases, eventos que se repiten — esta
// pantalla, por ahora, solo junta los datos propios de la materia (horario,
// salón, color); la conexión real con Proyectos/Tareas/Agenda llega en Fase 1b.
export const createSubjectSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe el nombre de la materia.').max(80, 'Máximo 80 caracteres.'),
    teacher: z.string().trim().max(80, 'Máximo 80 caracteres.').nullable(),
    days: z.array(z.enum(WEEKDAYS)).max(6),
    startsAt: timeOfDay,
    endsAt: timeOfDay,
    room: z.string().trim().max(80, 'Máximo 80 caracteres.'),
    color: z.enum(SUBJECT_COLORS),
  })
  .refine((subject) => subject.endsAt > subject.startsAt, {
    path: ['endsAt'],
    error: 'Debe terminar después de empezar.',
  })

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>
