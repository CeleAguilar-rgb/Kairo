'use server'

import { deleteEventSchema, eventSchema, moveEventSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api, ApiError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'
import type { IsoDate } from '@/lib/dates'

import type { EventRecord } from './records'

// Las acciones de la Agenda. Una Server Action es un endpoint público: lo que llega NO se confía, se
// vuelve a validar con el mismo esquema del front (packages/shared), y ese esquema también es el
// contrato de POST/PATCH /v1/events en la API: ahí se revalida otra vez.
export type EventActionResult =
  | { ok: true; id?: string; undoToken?: string }
  // `errors` va por campo ("title", "endTime"); `message` es un error general.
  | { ok: false; errors: Record<string, string>; message?: string }

const failure = (message: string): EventActionResult => ({ ok: false, errors: {}, message })

function apiFailure(error: unknown, fallback: string): EventActionResult {
  return failure(error instanceof ApiError ? error.message : fallback)
}

function refresh() {
  revalidatePath('/agenda')
  // La tarjeta "Esta semana" de Inicio lee de la misma agenda.
  revalidatePath('/')
}

export async function createEventAction(raw: unknown): Promise<EventActionResult> {
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const record = await api.post<EventRecord>('/events', parsed.data)
    refresh()
    return { ok: true, id: record.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar el evento. Intenta de nuevo.')
  }
}

// Edita el evento (si es una serie, toda la serie). Mover una sola vez de día es moveEventAction.
export async function updateEventAction(id: string, raw: unknown): Promise<EventActionResult> {
  const parsed = eventSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.patch(`/events/${id}`, parsed.data)
    refresh()
    return { ok: true, id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar los cambios. Intenta de nuevo.')
  }
}

// Pasa el evento (o solo esa vez de una serie) a otro día, conservando su hora. `occurrence` es el día
// de la vez que se mueve: la pantalla ya lo sabe (es la entrada en la que se picó "Mover"), así que se
// manda aparte del formulario (que solo pide la fecha nueva).
export async function moveEventAction(id: string, raw: unknown, occurrence: IsoDate): Promise<EventActionResult> {
  const parsed = moveEventSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post(`/events/${id}/move`, { date: parsed.data.date, occurrence })
    refresh()
    return { ok: true, id }
  } catch (error) {
    return apiFailure(error, 'No se pudo mover.')
  }
}

// "Duplicar": un evento suelto igual, el mismo día, con "(copia)" en el título.
export async function duplicateEventAction(id: string, occurrence: IsoDate): Promise<EventActionResult> {
  try {
    const copy = await api.post<EventRecord>(`/events/${id}/duplicate`, { occurrence })
    refresh()
    return { ok: true, id: copy.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo duplicar.')
  }
}

// Borra el evento, o solo esa vez, o esa y las siguientes, o toda la serie. Va a la papelera: el token
// que devuelve sirve para deshacerlo.
export async function deleteEventAction(id: string, raw: unknown): Promise<EventActionResult> {
  const parsed = deleteEventSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const res = await api.post<{ id: string; undoToken: string }>(`/events/${id}/delete`, parsed.data)
    refresh()
    return { ok: true, id, undoToken: res.undoToken }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar.')
  }
}

export async function undoDeleteAction(token: string): Promise<EventActionResult> {
  try {
    await api.post('/events/undo', { token })
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'Ya no se puede deshacer.')
  }
}
