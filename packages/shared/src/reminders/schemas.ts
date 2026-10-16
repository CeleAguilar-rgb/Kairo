import { z } from 'zod'

import { timeOfDay } from '../time'

import { REMINDER_REPEATS, REMINDER_SNOOZES } from './constants'

// Formulario "Nuevo" de Recordatorios (Recordatorios.dc.html). El día es un día suelto ('AAAA-MM-DD') y la
// hora una hora de pared en la zona del perfil: la API las junta en un momento UTC (remind_at).
// Que ese momento no sea del pasado lo revisa quien conoce la hora de ahora (el formulario y la acción),
// no el esquema.
export const createReminderSchema = z.object({
  title: z.string().trim().min(1, 'Escribe qué quieres que te recuerde.').max(120, 'Máximo 120 caracteres.'),
  date: z.iso.date('Elige un día.'),
  time: timeOfDay,
  repeat: z.enum(REMINDER_REPEATS),
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>

// Posponer un recordatorio: a qué hora vuelve a avisar.
export const snoozeReminderSchema = z.object({
  until: z.enum(REMINDER_SNOOZES),
})

export type SnoozeReminderInput = z.infer<typeof snoozeReminderSchema>
