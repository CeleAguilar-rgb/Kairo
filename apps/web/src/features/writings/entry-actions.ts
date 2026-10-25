'use server'

import { characterCreateSchema, characterUpdateSchema, confirmCoverUploadSchema, noteCreateSchema, noteUpdateSchema, signCoverUploadSchema } from '@kairo/shared'
import { z } from 'zod'

import { api } from '@/lib/api-client'

import { apiFailure, invalid, refreshWritings } from './action-errors'
import { failure, undoTokenOf, type SignedUploadResult, type WritingActionResult } from './action-result'

// Las acciones de una ficha de la wiki del mundo: un personaje o una nota (especie, lugar, nota de una sección
// extra). Se revalida lo que llega con el esquema de packages/shared; que cada valor sea del tipo de su campo y que
// cada vínculo sea del mismo mundo lo revisa la API, que conoce la plantilla.

const idSchema = z.uuid()
type EntryKind = 'character' | 'note'
const pathOf = (kind: EntryKind) => (kind === 'character' ? 'characters' : 'notes')
const notFound = (kind: EntryKind) => failure(kind === 'character' ? 'No encontramos ese personaje.' : 'No encontramos esa nota.')

// "+ Nuevo personaje": nace con su nombre; la pantalla lo abre en modo editar.
export async function createCharacterAction(worldId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')
  const parsed = characterCreateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    const created = await api.post<{ id: string }>(`/writings/worlds/${worldId}/characters`, parsed.data)
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear el personaje.')
  }
}

// "+ Nueva especie / región / lugar dentro / nota de una sección": la plantilla dice qué es.
export async function createWorldNoteAction(worldId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')
  const parsed = noteCreateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    const created = await api.post<{ id: string }>(`/writings/worlds/${worldId}/notes`, parsed.data)
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear.')
  }
}

// Lo que se edita desde el panel o la página completa: nombre, resumen, valores (solo los que cambiaron),
// secciones propias, enlace, bloques, portada…
export async function updateEntryAction(kind: EntryKind, id: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(id).success) return notFound(kind)
  const parsed = (kind === 'character' ? characterUpdateSchema : noteUpdateSchema).safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    await api.patch(`/writings/${pathOf(kind)}/${id}`, parsed.data)
    refreshWritings()
    return { ok: true, id }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar.')
  }
}

// Borrar va a la papelera; un lugar se lleva los que tiene dentro. El aviso trae "Deshacer".
export async function deleteEntryAction(kind: EntryKind, id: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(id).success) return notFound(kind)
  try {
    await api.delete(`/writings/${pathOf(kind)}/${id}`)
    refreshWritings()
    return { ok: true, id, undoToken: undoTokenOf(pathOf(kind), id) }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar.')
  }
}

// --- Foto y portada --------------------------------------------------------------------------------------

// `slot`: la foto de un personaje ("image") o la portada de su página completa ("cover"). Las notas solo tienen
// portada. Dos pasos (decisión #44): firmar aquí, subir desde el navegador, confirmar.
type Slot = 'image' | 'cover'

export async function signEntryUploadAction(kind: EntryKind, id: string, slot: Slot, raw: unknown): Promise<SignedUploadResult> {
  if (!idSchema.safeParse(id).success || (kind === 'note' && slot === 'image')) return { ok: false, message: 'No encontramos esa ficha.' }
  const parsed = signCoverUploadSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Elige una imagen.' }
  try {
    const signed = await api.post<{ path: string; token: string }>(`/writings/${pathOf(kind)}/${id}/${slot}/sign-upload`, parsed.data)
    return { ok: true, ...signed }
  } catch (error) {
    const result = apiFailure(error, 'No se pudo preparar la subida.')
    return { ok: false, message: (!result.ok && result.message) || 'No se pudo preparar la subida.' }
  }
}

export async function confirmEntryUploadAction(kind: EntryKind, id: string, slot: Slot, path: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(id).success || (kind === 'note' && slot === 'image')) return notFound(kind)
  const parsed = confirmCoverUploadSchema.safeParse({ path })
  if (!parsed.success) return failure('No encontramos esa imagen.')
  try {
    await api.post(`/writings/${pathOf(kind)}/${id}/${slot}/confirm`, parsed.data)
    refreshWritings()
    return { ok: true, id }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar la imagen.')
  }
}

export async function removeCharacterImageAction(id: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(id).success) return notFound('character')
  try {
    await api.delete(`/writings/characters/${id}/image`)
    refreshWritings()
    return { ok: true, id }
  } catch (error) {
    return apiFailure(error, 'No se pudo quitar la foto.')
  }
}
