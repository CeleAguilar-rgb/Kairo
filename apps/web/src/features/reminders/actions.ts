'use server'

import { createReminderSchema, snoozeReminderSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api, ApiError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import type { Reminder } from './types'

// Las acciones de Recordatorios. Una Server Action es un endpoint público: lo que llega NO se confía, se
// vuelve a validar con el mismo esquema del front (packages/shared), y el esquema compartido también es
// el contrato de POST /v1/reminders en la API: ahí se revalida otra vez.
export type ReminderActionResult =
  | { ok: true; id?: string; undoToken?: string }
  // `errors` va por campo ("title", "time"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

const failure = (message: string): ReminderActionResult => ({ ok: false, errors: {}, message })

function apiFailure(error: unknown, fallback: string): ReminderActionResult {
  return failure(error instanceof ApiError ? error.message : fallback)
}

function refresh() {
  revalidatePath('/recordatorios')
  // La tarjeta "Recordatorios" de Inicio lee de la misma lista.
  revalidatePath('/')
}

// El "token" de Deshacer no vive guardado en el servidor: una Server Action
// no sobrevive entre llamadas (y en Vercel cada una puede caer en una
// instancia distinta — decisión #36). Es la acción y el id codificados en el
// string mismo; undoReminderAction lo lee para saber a qué endpoint llamar.
const encodeUndo = (type: 'complete' | 'snooze', id: string) => `${type}:${id}`

export async function createReminderAction(raw: unknown): Promise<ReminderActionResult> {
  const parsed = createReminderSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const reminder = await api.post<Reminder>('/reminders', parsed.data)
    refresh()
    return { ok: true, id: reminder.id }
  } catch (error) {
    // La API revisa que la hora no haya pasado ya (solo ella sabe la hora de
    // ahora de verdad): ese error va al campo "time", como los de zod.
    if (error instanceof ApiError && error.code === 'REMINDER_IN_PAST') {
      return { ok: false, errors: { time: error.message } }
    }
    return apiFailure(error, 'No pudimos guardar el recordatorio. Intenta de nuevo.')
  }
}

// Marca como listo. Si se repite ("Cada día", "Lunes a viernes") la API hace nacer la siguiente vez;
// el token que devuelve deshace las dos cosas (lo resuelve uncomplete, ver reminders.service.ts).
export async function completeReminderAction(id: string): Promise<ReminderActionResult> {
  try {
    await api.post(`/reminders/${id}/complete`, {})
    refresh()
    return { ok: true, id, undoToken: encodeUndo('complete', id) }
  } catch (error) {
    return apiFailure(error, 'No se pudo marcar como listo.')
  }
}

// Pospone: vuelve a avisar en 10 minutos, en 1 hora o mañana a las 9.
export async function snoozeReminderAction(id: string, raw: unknown): Promise<ReminderActionResult> {
  const parsed = snoozeReminderSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post(`/reminders/${id}/snooze`, parsed.data)
    refresh()
    return { ok: true, id, undoToken: encodeUndo('snooze', id) }
  } catch (error) {
    return apiFailure(error, 'No se pudo posponer.')
  }
}

// "Deshacer" de marcar como listo o de posponer.
export async function undoReminderAction(token: string): Promise<ReminderActionResult> {
  const [type, id] = token.split(':')
  if (!id || (type !== 'complete' && type !== 'snooze')) return failure('Ya no se puede deshacer.')

  try {
    await api.post(`/reminders/${id}/${type === 'complete' ? 'uncomplete' : 'unsnooze'}`, {})
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'Ya no se puede deshacer.')
  }
}
