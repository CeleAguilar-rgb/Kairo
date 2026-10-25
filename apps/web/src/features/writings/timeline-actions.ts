'use server'

import { eraCreateSchema, eraUpdateSchema, eventCreateSchema, eventUpdateSchema, moveSchema } from '@kairo/shared'
import { z } from 'zod'

import { api } from '@/lib/api-client'

import { apiFailure, invalid, refreshWritings } from './action-errors'
import { failure, undoTokenOf, type WritingActionResult } from './action-result'

// Las acciones de la línea del tiempo (EscritosLinea.dc.html): eras y eventos. Quién participa y dónde pasa se
// revisan en la API contra el mismo mundo.

const idSchema = z.uuid()

export async function createEraAction(worldId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')
  const parsed = eraCreateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    const created = await api.post<{ id: string }>(`/writings/worlds/${worldId}/eras`, parsed.data)
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear la era.')
  }
}

export async function updateEraAction(eraId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(eraId).success) return failure('No encontramos esa era.')
  const parsed = eraUpdateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    await api.patch(`/writings/eras/${eraId}`, parsed.data)
    refreshWritings()
    return { ok: true, id: eraId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar la era.')
  }
}

export async function moveEraAction(eraId: string, direction: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(eraId).success) return failure('No encontramos esa era.')
  const parsed = moveSchema.safeParse({ direction })
  if (!parsed.success) return failure('No se pudo mover.')
  try {
    await api.post(`/writings/eras/${eraId}/move`, parsed.data)
    refreshWritings()
    return { ok: true, id: eraId }
  } catch (error) {
    return apiFailure(error, 'No se pudo mover la era.')
  }
}

export async function deleteEraAction(eraId: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(eraId).success) return failure('No encontramos esa era.')
  try {
    await api.delete(`/writings/eras/${eraId}`)
    refreshWritings()
    return { ok: true, id: eraId, undoToken: undoTokenOf('eras', eraId) }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar la era.')
  }
}

export async function createEventAction(raw: unknown): Promise<WritingActionResult> {
  const parsed = eventCreateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    const created = await api.post<{ id: string }>('/writings/events', parsed.data)
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear el evento.')
  }
}

export async function updateEventAction(eventId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(eventId).success) return failure('No encontramos ese evento.')
  const parsed = eventUpdateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    await api.patch(`/writings/events/${eventId}`, parsed.data)
    refreshWritings()
    return { ok: true, id: eventId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar el evento.')
  }
}

export async function moveEventAction(eventId: string, direction: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(eventId).success) return failure('No encontramos ese evento.')
  const parsed = moveSchema.safeParse({ direction })
  if (!parsed.success) return failure('No se pudo mover.')
  try {
    await api.post(`/writings/events/${eventId}/move`, parsed.data)
    refreshWritings()
    return { ok: true, id: eventId }
  } catch (error) {
    return apiFailure(error, 'No se pudo mover el evento.')
  }
}

export async function deleteEventAction(eventId: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(eventId).success) return failure('No encontramos ese evento.')
  try {
    await api.delete(`/writings/events/${eventId}`)
    refreshWritings()
    return { ok: true, id: eventId, undoToken: undoTokenOf('events', eventId) }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar el evento.')
  }
}
