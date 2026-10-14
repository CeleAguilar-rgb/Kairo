import { z } from 'zod'

import { EVENT_DELETE_SCOPES, EVENT_KINDS, EVENT_REMINDERS, EVENT_REPEATS } from './constants'

// Una hora de pared "HH:MM" de 24 horas ('09:30', '17:00').
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Escribe una hora válida.')

// Formulario de evento (EventoNuevo.dc.html): sirve para crear y para editar. La fecha es un día
// suelto ('AAAA-MM-DD') y las horas son horas de pared en la zona del perfil: la API las convierte
// a momentos UTC (starts_at, ends_at). Un evento de todo el día no lleva horas.
export const eventSchema = z
  .object({
    title: z.string().trim().min(1, 'Escribe un título para el evento.').max(120, 'Máximo 120 caracteres.'),
    kind: z.enum(EVENT_KINDS),
    date: z.iso.date('Elige una fecha.'),
    allDay: z.boolean(),
    startTime: timeOfDay.nullable(),
    endTime: timeOfDay.nullable(),
    // "Lugar o enlace": una dirección o el enlace de una llamada.
    location: z.string().trim().max(200, 'Máximo 200 caracteres.').nullable(),
    projectId: z.uuid().nullable(),
    repeat: z.enum(EVENT_REPEATS),
    reminder: z.enum(EVENT_REMINDERS),
    notes: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
  })
  .superRefine((event, context) => {
    if (event.allDay) return
    if (!event.startTime) context.addIssue({ code: 'custom', path: ['startTime'], message: 'Elige la hora de inicio.' })
    if (!event.endTime) context.addIssue({ code: 'custom', path: ['endTime'], message: 'Elige la hora en que termina.' })
    if (event.startTime && event.endTime && event.endTime <= event.startTime) {
      context.addIssue({ code: 'custom', path: ['endTime'], message: 'Tiene que terminar después de empezar.' })
    }
  })

export type EventInput = z.infer<typeof eventSchema>

// Mover un evento (o una vez de una serie) a otro día.
export const moveEventSchema = z.object({ date: z.iso.date('Elige una fecha.') })

export type MoveEventInput = z.infer<typeof moveEventSchema>

// Borrar un evento. `occurrence` es el día de la vez que se borra (en una serie).
export const deleteEventSchema = z.object({
  scope: z.enum(EVENT_DELETE_SCOPES),
  occurrence: z.iso.date(),
})

export type DeleteEventInput = z.infer<typeof deleteEventSchema>
