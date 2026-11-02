import { z } from 'zod'

import { FOCUS_KINDS, MAX_FOCUS_MINUTES } from './constants'

// Guardar un tramo del pomodoro que terminó (Reproductor.dc.html). `startedAt` es cuándo empezó (UTC); la API no lo
// acepta en el futuro. `taskId` es la tarea en la que se enfocó, si había una real; que sea de la persona lo revisa la
// API con el service de Tareas.
export const focusSessionSchema = z.object({
  kind: z.enum(FOCUS_KINDS),
  startedAt: z.iso.datetime({ message: 'Eso no es un momento válido.' }),
  minutes: z.number().int('Los minutos son un número entero.').min(1, 'Mínimo 1 minuto.').max(MAX_FOCUS_MINUTES, `Máximo ${MAX_FOCUS_MINUTES} minutos.`),
  taskId: z.uuid().nullable(),
})

export type FocusSessionInput = z.infer<typeof focusSessionSchema>

// Las sesiones desde un momento (UTC): el Next.js calcula el inicio del día o de la semana en la zona del perfil.
export const focusSessionsQuerySchema = z.object({ from: z.iso.datetime({ message: 'Eso no es un momento válido.' }) })

export type FocusSessionsQuery = z.infer<typeof focusSessionsQuerySchema>
