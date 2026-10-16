'use server'

import { characterSchema, emptyDoc, fieldTypeSchema, writingIdSchema, type FieldType } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import { failure, type WritingActionResult } from './action-result'
import { loadWritings, rememberUndo, type WritingsStore } from './mock-store'
import type { Character, CharacterField, CharacterValue } from './types'
import { FIELD_TYPE_LABEL } from './writing-meta'

// Las acciones de la base de datos de personajes. Una Server Action es un endpoint público: lo que llega NO se
// confía, se vuelve a validar con el mismo esquema del front (packages/shared) y se revisa contra las columnas
// reales del mundo. Con la API, en vez de tocar el almacén de ejemplo llaman a `api.post('/writings/characters')` y
// compañía; el userId lo pone la API con el token (regla 2) y toda consulta filtra por él (regla 3).

const MAX_OPTIONS_PER_FIELD = 40
const MAX_FIELDS_PER_WORLD = 20
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function refresh() {
  revalidatePath('/escritos', 'layout')
}

const fieldsOf = (store: WritingsStore, worldId: string) => store.characterFields.filter((field) => field.worldId === worldId)

// Pasa lo que llegó de la pantalla al valor que guarda su columna, o devuelve el mensaje de por qué no sirve.
// Una columna de selección recibe el texto de la opción: si ya existe se usa, y si no, se crea.
function valueFor(field: CharacterField, raw: string | number | null): { ok: true; value: CharacterValue } | { ok: false; message: string } {
  if (raw === null || raw === '') return { ok: true, value: null }

  if (field.type === 'number') {
    const value = typeof raw === 'number' ? raw : Number(raw.replace(',', '.'))
    return Number.isFinite(value) ? { ok: true, value } : { ok: false, message: 'Escribe un número.' }
  }
  if (field.type === 'date') {
    return typeof raw === 'string' && ISO_DAY.test(raw) && !Number.isNaN(Date.parse(raw)) ? { ok: true, value: raw } : { ok: false, message: 'Elige una fecha.' }
  }
  const text = String(raw).trim()
  if (field.type === 'select') {
    const existing = field.options.find((option) => option.label.toLowerCase() === text.toLowerCase())
    if (existing) return { ok: true, value: existing.id }
    if (field.options.length >= MAX_OPTIONS_PER_FIELD) return { ok: false, message: `Máximo ${MAX_OPTIONS_PER_FIELD} opciones.` }
    const option = { id: crypto.randomUUID(), label: text, tone: 'muted' as const }
    field.options.push(option)
    return { ok: true, value: option.id }
  }
  return { ok: true, value: text }
}

// "Nuevo personaje": una fila sin nombre ("Sin nombre") con todas sus columnas vacías.
export async function createCharacterAction(worldId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')

  await mockDelay()
  const { store } = await loadWritings()
  const world = store.worlds.find((item) => item.id === worldId)
  if (!world) return failure('No encontramos ese mundo.')

  const character: Character = {
    id: crypto.randomUUID(),
    worldId: world.id,
    name: 'Sin nombre',
    imagePath: null,
    values: Object.fromEntries(fieldsOf(store, world.id).map((field) => [field.id, null])),
    description: '',
    storyIds: [],
    pageId: null,
  }
  store.characters.push(character)
  refresh()
  return { ok: true, id: character.id }
}

// Guarda el nombre, la ficha y las columnas que cambiaron de un personaje.
export async function updateCharacterAction(characterId: string, raw: unknown): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(characterId).success) return failure('No encontramos a ese personaje.')
  const parsed = characterSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { store } = await loadWritings()
  const character = store.characters.find((item) => item.id === characterId)
  if (!character) return failure('No encontramos a ese personaje.')

  const fields = fieldsOf(store, character.worldId)
  const values: Record<string, CharacterValue> = { ...character.values }
  for (const [fieldId, value] of Object.entries(parsed.data.values)) {
    const field = fields.find((item) => item.id === fieldId)
    if (!field) return failure('Esa columna ya no existe.')
    const result = valueFor(field, value)
    if (!result.ok) return { ok: false, errors: { [fieldId]: result.message } }
    values[fieldId] = result.value
  }

  character.name = parsed.data.name
  character.description = parsed.data.description
  character.values = values
  refresh()
  return { ok: true, id: character.id }
}

// Borra un personaje. Va a la papelera: el aviso trae "Deshacer".
export async function deleteCharacterAction(characterId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(characterId).success) return failure('No encontramos a ese personaje.')

  await mockDelay()
  const { store } = await loadWritings()
  const index = store.characters.findIndex((item) => item.id === characterId)
  if (index === -1) return failure('No encontramos a ese personaje.')

  const [removed] = store.characters.splice(index, 1)
  // Se quita de las páginas donde aparecía; si se deshace, vuelve a aparecer.
  const pages = store.pages.filter((page) => page.characterIds.includes(characterId))
  for (const page of pages) page.characterIds = page.characterIds.filter((id) => id !== characterId)

  const undoToken = rememberUndo(store, () => {
    store.characters.splice(Math.min(index, store.characters.length), 0, removed)
    for (const page of pages) page.characterIds = [...page.characterIds, characterId]
  })
  refresh()
  return { ok: true, id: characterId, undoToken }
}

// "Propiedad" → un tipo: agrega una columna al final con el nombre del tipo ("Texto", "Número", "Selección", "Fecha").
export async function addFieldAction(worldId: string, rawType: unknown): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(worldId).success) return failure('No encontramos ese mundo.')
  const type = fieldTypeSchema.safeParse(rawType)
  if (!type.success) return failure('Ese tipo de propiedad no existe.')

  await mockDelay()
  const { store } = await loadWritings()
  const world = store.worlds.find((item) => item.id === worldId)
  if (!world) return failure('No encontramos ese mundo.')

  const fields = fieldsOf(store, world.id)
  if (fields.length >= MAX_FIELDS_PER_WORLD) return failure(`Máximo ${MAX_FIELDS_PER_WORLD} propiedades.`)

  const base = FIELD_TYPE_LABEL[type.data as FieldType]
  let name = base
  for (let n = 2; fields.some((field) => field.name.toLowerCase() === name.toLowerCase()); n += 1) name = `${base} ${n}`

  const field: CharacterField = { id: crypto.randomUUID(), worldId: world.id, name, type: type.data, options: [], builtIn: false }
  store.characterFields.push(field)
  refresh()
  return { ok: true, id: field.id }
}

// Quita una columna agregada a mano (Reino, Rol y Era no se quitan). Va a la papelera: el aviso trae "Deshacer" y
// con él vuelven también los valores que tenía cada personaje.
export async function deleteFieldAction(fieldId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(fieldId).success) return failure('Esa columna ya no existe.')

  await mockDelay()
  const { store } = await loadWritings()
  const index = store.characterFields.findIndex((item) => item.id === fieldId)
  if (index === -1) return failure('Esa columna ya no existe.')
  const field = store.characterFields[index]
  if (field.builtIn) return failure('Esa propiedad no se puede quitar.')

  store.characterFields.splice(index, 1)
  const saved = store.characters.filter((character) => fieldId in character.values).map((character) => ({ character, value: character.values[fieldId] }))
  for (const { character } of saved) delete character.values[fieldId]

  const undoToken = rememberUndo(store, () => {
    store.characterFields.splice(Math.min(index, store.characterFields.length), 0, field)
    for (const { character, value } of saved) character.values[fieldId] = value
  })
  refresh()
  return { ok: true, id: fieldId, undoToken }
}

// "Abrir como página": la ficha completa de un personaje como una página con editor. Se crea la primera vez
// (con lo que ya tenía escrito) y se vuelve a abrir la misma las siguientes.
export async function openCharacterPageAction(characterId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(characterId).success) return failure('No encontramos a ese personaje.')

  await mockDelay()
  const { store } = await loadWritings()
  const character = store.characters.find((item) => item.id === characterId)
  if (!character) return failure('No encontramos a ese personaje.')

  const existing = character.pageId ? store.pages.find((page) => page.id === character.pageId) : null
  if (existing) return { ok: true, id: existing.id }

  const content = character.description ? { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: character.description }] }] } : emptyDoc()
  const page = {
    id: crypto.randomUUID(),
    storyId: null,
    kind: 'page' as const,
    title: character.name,
    content,
    status: 'none' as const,
    wordCount: character.description ? character.description.split(/\s+/).filter(Boolean).length : 0,
    coverPath: null,
    tag: null,
    position: 0,
    characterIds: [character.id],
    updatedAt: new Date().toISOString(),
  }
  store.pages.push(page)
  character.pageId = page.id
  refresh()
  return { ok: true, id: page.id }
}
