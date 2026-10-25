'use server'

import { confirmCoverUploadSchema, signCoverUploadSchema, templateCreateSchema, templateUpdateSchema, worldUpdateSchema } from '@kairo/shared'
import { z } from 'zod'

import { api } from '@/lib/api-client'

import { apiFailure, invalid, refreshWritings } from './action-errors'
import { failure, undoTokenOf, type SignedUploadResult, type WritingActionResult } from './action-result'

// Las acciones de un mundo: su sinopsis, reglas, pestañas y contadores, sus secciones extra y sus plantillas, y el
// mapa. Una Server Action es un endpoint público: lo que llega NO se confía, se vuelve a validar con el mismo
// esquema del front (packages/shared), y ese esquema es también el contrato de la API, que lo revisa otra vez. El
// userId lo pone la API con el token (regla 2) y toda consulta filtra por él (regla 3).

const idSchema = z.uuid()

// Lo que se cambia de un mundo, una cosa a la vez (solo viaja lo que cambió).
export async function updateWorldAction(worldId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')
  const parsed = worldUpdateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    await api.patch(`/writings/worlds/${worldId}`, parsed.data)
    refreshWritings()
    return { ok: true, id: worldId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar.')
  }
}

export async function deleteWorldAction(worldId: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')
  try {
    await api.delete(`/writings/worlds/${worldId}`)
    refreshWritings()
    return { ok: true, id: worldId, undoToken: undoTokenOf('worlds', worldId) }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar el mundo.')
  }
}

// --- Secciones extra y plantillas ------------------------------------------------------------------------

// "Nueva sección" (menú Más): nace con un campo y una sección; la pantalla abre su editor de plantilla.
export async function createSectionAction(worldId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')
  const parsed = templateCreateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    const created = await api.post<{ id: string }>(`/writings/worlds/${worldId}/templates`, parsed.data)
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear la sección.')
  }
}

// El editor de plantillas guarda la plantilla completa (nombre, color y la lista de campos en orden): la pantalla
// arma la lista nueva y la manda entera. El id de cada campo nunca cambia.
export async function updateTemplateAction(templateId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(templateId).success) return failure('No encontramos esa plantilla.')
  const parsed = templateUpdateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    await api.patch(`/writings/templates/${templateId}`, parsed.data)
    refreshWritings()
    return { ok: true, id: templateId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar la plantilla.')
  }
}

// Borra una sección extra con sus notas. El aviso trae "Deshacer".
export async function deleteTemplateAction(templateId: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(templateId).success) return failure('No encontramos esa sección.')
  try {
    await api.delete(`/writings/templates/${templateId}`)
    refreshWritings()
    return { ok: true, id: templateId, undoToken: undoTokenOf('templates', templateId) }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar la sección.')
  }
}

// --- El mapa ------------------------------------------------------------------------------------------

// Subir el mapa son dos pasos (igual que la portada de un proyecto, decisión #44): firmar aquí, el navegador sube
// los bytes directo a Storage, y confirmar.
export async function signMapUploadAction(worldId: string, raw: unknown): Promise<SignedUploadResult> {
  if (!idSchema.safeParse(worldId).success) return { ok: false, message: 'No encontramos ese mundo.' }
  const parsed = signCoverUploadSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Elige una imagen.' }
  try {
    const signed = await api.post<{ path: string; token: string }>(`/writings/worlds/${worldId}/map/sign-upload`, parsed.data)
    return { ok: true, ...signed }
  } catch (error) {
    const result = apiFailure(error, 'No se pudo preparar la subida.')
    return { ok: false, message: (!result.ok && result.message) || 'No se pudo preparar la subida.' }
  }
}

export async function confirmMapUploadAction(worldId: string, path: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')
  const parsed = confirmCoverUploadSchema.safeParse({ path })
  if (!parsed.success) return failure('No encontramos esa imagen.')
  try {
    await api.post(`/writings/worlds/${worldId}/map/confirm`, parsed.data)
    refreshWritings()
    return { ok: true, id: worldId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar el mapa.')
  }
}
