'use server'

import { templateFieldHintSchema, templateFieldTypeSchema, templateNameSchema, writingIdSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { mockDelay } from '@/lib/mock/context'

import { failure, type WritingActionResult } from './action-result'
import { loadWritings, rememberUndo, type WritingsStore } from './mock-store'
import type { FieldKind, NoteTemplate, TemplateField } from './types'

// Las acciones del editor de plantillas (EscritosPlantilla.dc.html, decisión #45): renombrar la plantilla y
// agregar, renombrar, cambiar de tipo, reordenar o quitar un campo. Mismo patrón que character-actions.ts: una
// Server Action revalida lo que llega con el esquema de packages/shared y no confía en nada más. Con la API, en
// vez de tocar el almacén de ejemplo llaman a `api.patch('/writings/templates/:id', ...)`.

const MAX_FIELDS_PER_TEMPLATE = 24

function refresh() {
  revalidatePath('/escritos', 'layout')
}

function findTemplate(store: WritingsStore, templateId: string): NoteTemplate | undefined {
  return store.noteTemplates.find((item) => item.id === templateId)
}

// Dónde insertar un campo nuevo: al final de su grupo (los "de vista corta" juntos, las "secciones" juntas),
// aunque los dos grupos vivan en el mismo arreglo `fields` (una sola columna jsonb, sin posición aparte). Como
// las secciones siempre van después de los campos, "agregar sección" es agregar al final; "agregar campo" es
// agregar justo antes de la primera sección (o al final, si todavía no hay ninguna).
function insertAtGroupEnd(fields: TemplateField[], kind: FieldKind, field: TemplateField): TemplateField[] {
  if (kind === 'section') return [...fields, field]
  const firstSectionIndex = fields.findIndex((item) => item.kind === 'section')
  const index = firstSectionIndex === -1 ? fields.length : firstSectionIndex
  return [...fields.slice(0, index), field, ...fields.slice(index)]
}

export async function renameTemplateAction(templateId: string, rawName: unknown): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(templateId).success) return failure('No encontramos esa plantilla.')
  const name = templateNameSchema.safeParse(rawName)
  if (!name.success) return failure(name.error.issues[0]?.message ?? 'Ponle un nombre.')

  await mockDelay()
  const { store } = await loadWritings()
  const template = findTemplate(store, templateId)
  if (!template) return failure('No encontramos esa plantilla.')

  template.name = name.data
  refresh()
  return { ok: true, id: template.id }
}

// "+ Agregar campo" / "+ Agregar sección": un campo sin nombre al final de su grupo. `kind` se decide por cuál
// botón se tocó, no llega del cliente como texto libre.
export async function addTemplateFieldAction(templateId: string, kind: FieldKind): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(templateId).success) return failure('No encontramos esa plantilla.')

  await mockDelay()
  const { store } = await loadWritings()
  const template = findTemplate(store, templateId)
  if (!template) return failure('No encontramos esa plantilla.')
  if (template.fields.length >= MAX_FIELDS_PER_TEMPLATE) return failure(`Máximo ${MAX_FIELDS_PER_TEMPLATE} campos.`)

  const field: TemplateField = {
    id: crypto.randomUUID(),
    kind,
    key: null,
    name: kind === 'field' ? 'Campo nuevo' : 'Sección nueva',
    type: 'text',
    hint: '',
    options: [],
  }
  template.fields = insertAtGroupEnd(template.fields, kind, field)
  refresh()
  return { ok: true, id: field.id }
}

export async function renameTemplateFieldAction(templateId: string, fieldId: string, rawName: unknown): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(templateId).success || !writingIdSchema.safeParse(fieldId).success) return failure('Ese campo ya no existe.')
  const name = templateNameSchema.safeParse(rawName)
  if (!name.success) return failure(name.error.issues[0]?.message ?? 'Ponle un nombre.')

  await mockDelay()
  const { store } = await loadWritings()
  const field = findTemplate(store, templateId)?.fields.find((item) => item.id === fieldId)
  if (!field) return failure('Ese campo ya no existe.')

  field.name = name.data
  refresh()
  return { ok: true, id: field.id }
}

// Solo tiene efecto en un campo "de vista corta" (kind 'field'); el <select> del editor solo se muestra ahí.
export async function setTemplateFieldTypeAction(templateId: string, fieldId: string, rawType: unknown): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(templateId).success || !writingIdSchema.safeParse(fieldId).success) return failure('Ese campo ya no existe.')
  const type = templateFieldTypeSchema.safeParse(rawType)
  if (!type.success) return failure('Ese tipo de campo no existe.')

  await mockDelay()
  const { store } = await loadWritings()
  const field = findTemplate(store, templateId)?.fields.find((item) => item.id === fieldId)
  if (!field) return failure('Ese campo ya no existe.')

  // Cambiar de tipo empieza sus opciones de cero: las de un tipo (p. ej. las de "Selección") no significan nada en otro.
  field.type = type.data
  if (type.data !== 'select') field.options = []
  refresh()
  return { ok: true, id: field.id }
}

// Solo tiene efecto en una sección "para rellenar" (kind 'section'): la pregunta guía ("Pregunta guía (opcional)").
export async function setTemplateFieldHintAction(templateId: string, fieldId: string, rawHint: unknown): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(templateId).success || !writingIdSchema.safeParse(fieldId).success) return failure('Ese campo ya no existe.')
  const hint = templateFieldHintSchema.safeParse(rawHint)
  if (!hint.success) return failure(hint.error.issues[0]?.message ?? 'Pregunta demasiado larga.')

  await mockDelay()
  const { store } = await loadWritings()
  const field = findTemplate(store, templateId)?.fields.find((item) => item.id === fieldId)
  if (!field) return failure('Ese campo ya no existe.')

  field.hint = hint.data
  refresh()
  return { ok: true, id: field.id }
}

// La flecha "↑" del editor: sube un campo un lugar dentro de su propio grupo (vista corta o secciones), nunca
// se mezcla con el otro grupo. El primero de su grupo no tiene flecha (el canvas la deshabilita).
export async function moveTemplateFieldUpAction(templateId: string, fieldId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(templateId).success || !writingIdSchema.safeParse(fieldId).success) return failure('Ese campo ya no existe.')

  await mockDelay()
  const { store } = await loadWritings()
  const template = findTemplate(store, templateId)
  const field = template?.fields.find((item) => item.id === fieldId)
  if (!template || !field) return failure('Ese campo ya no existe.')

  const sameKind = template.fields.filter((item) => item.kind === field.kind)
  const posInGroup = sameKind.findIndex((item) => item.id === fieldId)
  if (posInGroup <= 0) return { ok: true, id: fieldId }
  const prevId = sameKind[posInGroup - 1].id

  const indexA = template.fields.findIndex((item) => item.id === fieldId)
  const indexB = template.fields.findIndex((item) => item.id === prevId)
  ;[template.fields[indexA], template.fields[indexB]] = [template.fields[indexB], template.fields[indexA]]
  refresh()
  return { ok: true, id: fieldId }
}

// Quita un campo. No hay papelera para esto (no es un dato de la persona, es la forma de la plantilla): el
// "Deshacer" del aviso vuelve a ponerlo en su lugar mientras el servidor no se reinicie.
export async function removeTemplateFieldAction(templateId: string, fieldId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(templateId).success || !writingIdSchema.safeParse(fieldId).success) return failure('Ese campo ya no existe.')

  await mockDelay()
  const { store } = await loadWritings()
  const template = findTemplate(store, templateId)
  if (!template) return failure('No encontramos esa plantilla.')
  const index = template.fields.findIndex((item) => item.id === fieldId)
  if (index === -1) return failure('Ese campo ya no existe.')

  const [removed] = template.fields.splice(index, 1)
  const undoToken = rememberUndo(store, () => {
    template.fields.splice(Math.min(index, template.fields.length), 0, removed)
  })
  refresh()
  return { ok: true, id: fieldId, undoToken }
}
