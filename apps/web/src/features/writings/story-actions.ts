'use server'

import { storyCreateSchema, storySchema, storyUpdateSchema, worldSchema, type StoryStatus } from '@kairo/shared'
import { z } from 'zod'

import { api } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'

import { apiFailure, invalid, refreshWritings } from './action-errors'
import { failure, undoTokenOf, type WritingActionResult } from './action-result'
import type { Library } from './types'

// Las acciones de Inicio de Escritos y de las historias: historias y cuadernos, sus capítulos o páginas, notas
// rápidas, mundos nuevos y "Escribir". Se revalida lo que llega con el esquema de packages/shared (que también es el
// contrato de la API); el userId lo pone la API con el token (regla 2).

const idSchema = z.uuid()

// Crea una historia o un cuaderno. `worldId` lo pone la pantalla (desde la pestaña Historias de un mundo) y
// `status` cuando se crea como idea; el formulario solo trae título, tipo, resumen, color y meta.
export async function createStoryAction(raw: unknown, place: { worldId?: string | null; status?: StoryStatus } = {}): Promise<WritingActionResult> {
  const form = storySchema.safeParse(raw)
  if (!form.success) return invalid(form.error.issues)
  const parsed = storyCreateSchema.safeParse({ ...form.data, worldId: place.worldId ?? null, status: place.status })
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    const created = await api.post<{ id: string }>('/writings/stories', parsed.data)
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear la historia.')
  }
}

// Lo que se edita de una historia desde su pestaña: datos, estado, era y lugar, arcos, elenco y material.
export async function updateStoryAction(storyId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(storyId).success) return failure('No encontramos esa historia.')
  const parsed = storyUpdateSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    await api.patch(`/writings/stories/${storyId}`, parsed.data)
    refreshWritings()
    return { ok: true, id: storyId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar la historia.')
  }
}

export async function deleteStoryAction(storyId: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(storyId).success) return failure('No encontramos esa historia.')
  try {
    await api.delete(`/writings/stories/${storyId}`)
    refreshWritings()
    return { ok: true, id: storyId, undoToken: undoTokenOf('stories', storyId) }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar la historia.')
  }
}

// "Nueva nota": una nota rápida en blanco (EscritosInicio).
export async function createNoteAction(): Promise<WritingActionResult> {
  try {
    const created = await api.post<{ id: string }>('/writings/pages', { kind: 'note', storyId: null, title: 'Nota nueva' })
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear la nota.')
  }
}

// "Agregar capítulo" / "Agregar página": una página en blanco al final de la historia o del cuaderno. La API decide
// cuál de las dos según el tipo de la historia; aquí se manda el que corresponde.
export async function createChapterAction(storyId: string, kind: 'story' | 'notebook' = 'story'): Promise<WritingActionResult> {
  if (!idSchema.safeParse(storyId).success) return failure('No encontramos esa historia.')
  const isStory = kind === 'story'
  try {
    const created = await api.post<{ id: string }>('/writings/pages', { kind: isStory ? 'chapter' : 'page', storyId, title: isStory ? 'Capítulo nuevo' : 'Página nueva' })
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear la página.')
  }
}

// "Escribir": la última página que se tocó. Si todavía no hay ninguna, abre una nota en blanco.
export async function startWritingAction(): Promise<WritingActionResult> {
  if (DEMO_MODE) return failure('En el modo demo no se guarda nada: es solo para mirar.')
  try {
    const library = await api.get<Library>('/writings/library')
    const last = [...library.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    if (last) return { ok: true, id: last.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo abrir.')
  }
  return createNoteAction()
}

// Crea un mundo con su nombre y de qué trata. Nace con sus plantillas de Personaje, Especie y Lugar.
export async function createWorldAction(raw: unknown): Promise<WritingActionResult> {
  const parsed = worldSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    const created = await api.post<{ id: string }>('/writings/worlds', parsed.data)
    refreshWritings()
    return { ok: true, id: created.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear el mundo.')
  }
}
