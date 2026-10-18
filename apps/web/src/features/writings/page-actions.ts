'use server'

import { pageSaveSchema, tiptapWordCount, writingIdSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import { failure, type WritingActionResult } from './action-result'
import { addWordsToday, loadWritings, rememberUndo, runUndo } from './mock-store'

// Las acciones de una página: guardar lo que se escribe, borrarla y deshacer. Una Server Action es un endpoint
// público: lo que llega NO se confía, se vuelve a validar con el mismo esquema del front (packages/shared), y el
// contenido se revisa a fondo (tipos de bloque permitidos, direcciones seguras, tamaño). Con la API, en vez de
// tocar el almacén de ejemplo llaman a `api.patch('/writings/pages/:id', …)`; el userId lo pone la API con el
// token (regla 2) y toda consulta filtra por él (regla 3).

// Guarda el título, el estado, la etiqueta y el contenido de una página. Las palabras las cuenta el servidor del
// contenido que recibe (el número que mande la pantalla nunca se usa). No revalida las demás pantallas: guarda
// cada pocos segundos mientras se escribe, y las listas leen los datos nuevos al entrar a ellas.
export async function savePageAction(pageId: string, raw: unknown): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(pageId).success) return failure('No encontramos esa página.')
  const parsed = pageSaveSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues), message: 'No se pudo guardar: el contenido no es válido.' }

  await mockDelay()
  const { store, ctx } = await loadWritings()
  const page = store.pages.find((item) => item.id === pageId)
  if (!page) return failure('No encontramos esa página.')

  const wordCount = tiptapWordCount(parsed.data.content)
  addWordsToday(store, ctx.today, wordCount - page.wordCount)

  page.title = parsed.data.title
  page.status = parsed.data.status
  page.tag = page.kind === 'note' ? parsed.data.tag || null : page.tag
  page.content = parsed.data.content
  page.wordCount = wordCount
  page.updatedAt = new Date().toISOString()
  return { ok: true, id: page.id, savedAt: page.updatedAt }
}

// Borra una página. Va a la papelera: el aviso trae "Deshacer".
export async function deletePageAction(pageId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(pageId).success) return failure('No encontramos esa página.')

  await mockDelay()
  const { store } = await loadWritings()
  const index = store.pages.findIndex((item) => item.id === pageId)
  if (index === -1) return failure('No encontramos esa página.')

  const [removed] = store.pages.splice(index, 1)
  // La ficha de un personaje que apuntaba a esta página se queda sin página (y vuelve a apuntar si se deshace).
  const orphans = store.characters.filter((character) => character.pageId === pageId)
  for (const character of orphans) character.pageId = null

  const undoToken = rememberUndo(store, () => {
    store.pages.splice(Math.min(index, store.pages.length), 0, removed)
    for (const character of orphans) character.pageId = pageId
  })
  revalidatePath('/escritos', 'layout')
  return { ok: true, id: pageId, undoToken }
}

// "Deshacer" de cualquier borrado de Escritos (páginas, personajes…): cada acción guarda cómo volver atrás y le
// da su token al aviso.
export async function undoWritingAction(token: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(token).success) return failure('Ya no se puede deshacer.')

  await mockDelay()
  const { store } = await loadWritings()
  if (!runUndo(store, token)) return failure('Ya no se puede deshacer.')
  revalidatePath('/escritos', 'layout')
  return { ok: true }
}
