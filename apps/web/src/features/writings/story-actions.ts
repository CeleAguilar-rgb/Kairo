'use server'

import { emptyDoc, storySchema, worldSchema, writingIdSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import { failure, type WritingActionResult } from './action-result'
import { loadWritings } from './mock-store'
import type { Story, World, WritingPage } from './types'

// Las acciones de Inicio de Escritos: historias y cuadernos, notas y mundos nuevos, y "Escribir". Una Server Action
// es un endpoint público: lo que llega NO se confía, se vuelve a validar con el mismo esquema del front
// (packages/shared). Con la API, en vez de tocar el almacén de ejemplo llaman a `api.post('/writings/...')`; el
// userId lo pone la API con el token (regla 2) y toda consulta filtra por él (regla 3).

function refresh() {
  revalidatePath('/escritos', 'layout')
}

// Crea una historia o un cuaderno. Una historia nueva todavía no tiene mundo, capítulos ni personajes.
export async function createStoryAction(raw: unknown): Promise<WritingActionResult> {
  const parsed = storySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { store } = await loadWritings()
  const story: Story = {
    id: crypto.randomUUID(),
    title: parsed.data.title,
    kind: parsed.data.kind,
    summary: parsed.data.summary,
    color: parsed.data.color,
    wordGoal: parsed.data.wordGoal,
    worldId: null,
    eraId: null,
    regionId: null,
    resources: [],
  }
  store.stories.push(story)
  refresh()
  return { ok: true, id: story.id }
}

// "Nueva nota": una nota en blanco que aparece arriba de las demás (EscritosInicio).
export async function createNoteAction(): Promise<WritingActionResult> {
  await mockDelay()
  const { store } = await loadWritings()
  const note = blankPage('note', 'Nota nueva')
  note.position = store.pages.filter((page) => page.kind === 'note').length
  store.pages.push(note)
  refresh()
  return { ok: true, id: note.id }
}

// "Agregar capítulo" / "Agregar página": una página en blanco al final de la historia o del cuaderno. El canvas no
// trae este botón, pero sin él una historia nueva no podría tener capítulos.
export async function createChapterAction(storyId: string): Promise<WritingActionResult> {
  if (!writingIdSchema.safeParse(storyId).success) return failure('No encontramos esa historia.')

  await mockDelay()
  const { store } = await loadWritings()
  const story = store.stories.find((item) => item.id === storyId)
  if (!story) return failure('No encontramos esa historia.')

  const isStory = story.kind === 'story'
  const created = blankPage(isStory ? 'chapter' : 'page', isStory ? 'Capítulo nuevo' : 'Página nueva')
  created.storyId = story.id
  created.position = store.pages.filter((page) => page.storyId === story.id).length
  store.pages.push(created)
  refresh()
  return { ok: true, id: created.id }
}

// "Escribir": la última página que se tocó. Si todavía no hay ninguna, abre una nota en blanco.
export async function startWritingAction(): Promise<WritingActionResult> {
  await mockDelay()
  const { store } = await loadWritings()
  const last = [...store.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  if (last) return { ok: true, id: last.id }
  const note = blankPage('note', 'Nota nueva')
  store.pages.push(note)
  refresh()
  return { ok: true, id: note.id }
}

// Crea un mundo con su nombre y de qué trata. Las regiones, eras y especies se agregan después.
export async function createWorldAction(raw: unknown): Promise<WritingActionResult> {
  const parsed = worldSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { store } = await loadWritings()
  if (store.worlds.some((world) => world.name.toLowerCase() === parsed.data.name.toLowerCase())) {
    return { ok: false, errors: { name: 'Ya tienes un mundo con ese nombre.' } }
  }
  const world: World = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    description: parsed.data.description,
    coverPath: null,
    hasMap: false,
    eras: [],
    regions: [],
    lore: [],
    ideas: [],
    species: [],
    rules: [],
  }
  store.worlds.push(world)
  refresh()
  return { ok: true, id: world.id }
}

function blankPage(kind: WritingPage['kind'], title: string): WritingPage {
  return {
    id: crypto.randomUUID(),
    storyId: null,
    kind,
    title,
    content: emptyDoc(),
    status: 'none',
    wordCount: 0,
    coverPath: null,
    tag: null,
    position: 0,
    characterIds: [],
    updatedAt: new Date().toISOString(),
  }
}
