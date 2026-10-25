'use server'

import { chapterMetaSchema, pageSaveSchema } from '@kairo/shared'
import { z } from 'zod'

import { api } from '@/lib/api-client'

import { apiFailure, invalid, refreshWritings } from './action-errors'
import { failure, UNDO_KINDS, undoTokenOf, type WritingActionResult } from './action-result'

// Las acciones de una página: guardar lo que se escribe, sus datos de capítulo, borrarla y "Deshacer" cualquier
// borrado de Escritos. El contenido se revisa a fondo (tipos de bloque permitidos, direcciones seguras, tamaño) aquí
// y otra vez en la API, que es quien cuenta las palabras (el número que mande la pantalla nunca se usa).

const idSchema = z.uuid()

// Guarda el título, el estado, la etiqueta y el contenido. No revalida las demás pantallas: guarda cada pocos
// segundos mientras se escribe, y las listas leen los datos nuevos al entrar a ellas.
export async function savePageAction(pageId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(pageId).success) return failure('No encontramos esa página.')
  const parsed = pageSaveSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues, 'No se pudo guardar: el contenido no es válido.')
  try {
    const saved = await api.patch<{ id: string; updatedAt: string }>(`/writings/pages/${pageId}`, parsed.data)
    return { ok: true, id: saved.id, savedAt: saved.updatedAt }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar.')
  }
}

// El arco, la era y el punto de vista de un capítulo.
export async function setChapterMetaAction(pageId: string, raw: unknown): Promise<WritingActionResult> {
  if (!idSchema.safeParse(pageId).success) return failure('No encontramos esa página.')
  const parsed = chapterMetaSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    await api.patch(`/writings/pages/${pageId}/meta`, parsed.data)
    refreshWritings()
    return { ok: true, id: pageId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar.')
  }
}

// Borra una página. Va a la papelera: el aviso trae "Deshacer".
export async function deletePageAction(pageId: string): Promise<WritingActionResult> {
  if (!idSchema.safeParse(pageId).success) return failure('No encontramos esa página.')
  try {
    await api.delete(`/writings/pages/${pageId}`)
    refreshWritings()
    return { ok: true, id: pageId, undoToken: undoTokenOf('pages', pageId) }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar.')
  }
}

// "Deshacer" de cualquier borrado de Escritos. El token es "<tipo>:<id>" (action-result.ts): se revisan los dos
// antes de armar la ruta, así nunca se llama a algo que no sea un "restaurar" de Escritos.
const undoTokenSchema = z.string().regex(new RegExp(`^(${UNDO_KINDS.join('|')}):[0-9a-f-]{36}$`, 'i'))

export async function undoWritingAction(token: string): Promise<WritingActionResult> {
  if (!undoTokenSchema.safeParse(token).success) return failure('Ya no se puede deshacer.')
  const [kind, id] = token.split(':') as [string, string]
  if (!idSchema.safeParse(id).success) return failure('Ya no se puede deshacer.')
  try {
    await api.post(`/writings/${kind}/${id}/restore`, {})
    refreshWritings()
    return { ok: true, id }
  } catch (error) {
    return apiFailure(error, 'Ya no se puede deshacer.')
  }
}
