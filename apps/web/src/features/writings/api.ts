import 'server-only'

import { DEFAULT_DAILY_WORD_GOAL, emptyDoc, type TiptapDoc } from '@kairo/shared'
import { cache } from 'react'

import { api, ApiError } from '@/lib/api-client'
import { addDays, startOfWeek } from '@/lib/dates'
import { DEMO_MODE } from '@/lib/demo'
import { getMockContext } from '@/lib/mock/context'

import { buildWritingDays, buildWritingsLibrary, demoPageContent } from './mock'
import type {
  BookView,
  CharacterChip,
  CharacterDbView,
  CharacterRecord,
  Crumb,
  Entry,
  Library,
  NoteCard,
  NoteRecord,
  PageEditorView,
  PageRecord,
  WorldBundle,
  WorldCard,
  WritingDay,
  WritingsOverview,
} from './types'
import { bookViewOf, characterChip, noteCardsOf, plural, savedTextOf, weekOf } from './writing-utils'
import { eraLabel, kingdomOf, kingdomTone, linkOptions, statCatalog, templateByKey } from './world-utils'

// Las lecturas de Escritos. La API manda hechos crudos en una sola respuesta (`GET /writings/library`: mundos,
// plantillas, fichas, eras, eventos, historias y páginas, sin el contenido de los capítulos) y aquí se arma lo que
// necesita cada pestaña (decisión #38). `cache` hace que el layout y la página de una misma navegación compartan
// UNA sola petición. Modo demo (lib/demo.ts): no hay API, se arma el mundo de ejemplo (mock.ts).

const loadLibrary = cache(async (): Promise<Library> => {
  if (DEMO_MODE) return buildWritingsLibrary(await getMockContext())
  return api.get<Library>('/writings/library')
})

const loadDays = cache(async (from: string): Promise<WritingDay[]> => {
  if (DEMO_MODE) return buildWritingDays(await getMockContext())
  return api.get<WritingDay[]>(`/writings/days?from=${from}`)
})

// Una lectura de algo que puede no existir (o no ser tuyo): un 404 de la API es "no está", no un error.
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

// --- El mundo ---------------------------------------------------------------------------------------

function bundleOf(library: Library, worldId: string): WorldBundle | null {
  const world = library.worlds.find((item) => item.id === worldId)
  if (!world) return null
  const eras = library.eras.filter((era) => era.worldId === worldId).sort((a, b) => a.position - b.position)
  const eraIds = new Set(eras.map((era) => era.id))
  const stories = library.stories.filter((story) => story.worldId === worldId)
  const storyIds = new Set(stories.map((story) => story.id))
  return {
    world,
    templates: library.templates.filter((template) => template.worldId === worldId).sort((a, b) => a.position - b.position),
    characters: library.characters.filter((character) => character.worldId === worldId),
    notes: library.notes.filter((note) => note.worldId === worldId),
    eras,
    events: library.events.filter((event) => eraIds.has(event.eraId)).sort((a, b) => a.position - b.position),
    stories,
    chapters: library.pages.filter((page) => page.storyId && storyIds.has(page.storyId)),
  }
}

// Todo un mundo para su página (WorldShell lo reparte a cada pestaña, al panel y a la página completa). null si no
// existe o no es tuyo: la ruta responde "no encontrado".
export async function getWorldBundle(worldId: string): Promise<WorldBundle | null> {
  return bundleOf(await loadLibrary(), worldId)
}

// Una ficha con su contenido (los bloques de su página completa), más el mundo para resolver nombres y vínculos.
export async function getEntryPage(worldId: string, entryId: string): Promise<{ bundle: WorldBundle; entry: Entry } | null> {
  const bundle = await getWorldBundle(worldId)
  if (!bundle) return null
  const character = bundle.characters.find((item) => item.id === entryId)
  const note = bundle.notes.find((item) => item.id === entryId)
  if (!character && !note) return null
  if (DEMO_MODE) return { bundle, entry: character ? { kind: 'character', ...character, content: null } : { kind: 'note', ...note!, content: null } }
  if (character) {
    const full = await orNull(api.get<CharacterRecord>(`/writings/characters/${entryId}`))
    return full ? { bundle, entry: { kind: 'character', ...full } } : null
  }
  const full = await orNull(api.get<NoteRecord>(`/writings/notes/${entryId}`))
  return full ? { bundle, entry: { kind: 'note', ...full } } : null
}

// El chip de un personaje: su reino (el que se ve debajo del nombre) y su color.
function chipOf(library: Library, character: CharacterRecord): CharacterChip {
  const bundle = bundleOf(library, character.worldId)
  const kingdom = bundle ? kingdomOf(bundle, character) : null
  return characterChip(character, { label: kingdom?.name ?? '', tone: bundle ? kingdomTone(bundle, kingdom?.id ?? null) : 'muted' })
}

// --- Inicio de Escritos -------------------------------------------------------------------------------

export async function getWritingsOverview(): Promise<WritingsOverview> {
  const ctx = await getMockContext()
  const monday = startOfWeek(ctx.today, 'monday')
  const [library, days] = await Promise.all([loadLibrary(), loadDays(addDays(monday, -7))])
  const week = weekOf(days, ctx.today)
  const lastPage = [...library.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  return {
    worldCount: library.worlds.length,
    bookCount: library.stories.length,
    storyCount: library.stories.filter((story) => story.kind === 'story').length,
    noteCount: library.pages.filter((page) => page.kind === 'note').length,
    characterCount: library.characters.length,
    weekTotal: week.reduce((sum, day) => sum + day.words, 0),
    dailyGoal: DEFAULT_DAILY_WORD_GOAL,
    week,
    lastPageId: lastPage?.id ?? null,
  }
}

// "1 mundo, 1 historia, 6 notas y 22 personajes." (EscritosInicio)
export function overviewText(overview: WritingsOverview): string {
  const parts = [
    plural(overview.worldCount, 'mundo', 'mundos'),
    plural(overview.storyCount, 'historia', 'historias'),
    plural(overview.noteCount, 'nota', 'notas'),
    plural(overview.characterCount, 'personaje', 'personajes'),
  ]
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}.`
}

// Las historias y los cuadernos, cada uno con sus capítulos o páginas y su elenco.
export async function getBooks(): Promise<BookView[]> {
  const library = await loadLibrary()
  return library.stories.map((story) => {
    const bundle = story.worldId ? bundleOf(library, story.worldId) : null
    const eraIndex = bundle ? bundle.eras.findIndex((era) => era.id === story.eraId) : -1
    const cast = library.characters.filter((character) => story.cast.includes(character.id)).map((character) => chipOf(library, character))
    return bookViewOf(story, library.pages, { worldName: bundle?.world.name ?? null, eraLabel: bundle && eraIndex >= 0 ? eraLabel(bundle.eras[eraIndex]!, eraIndex) : null }, cast)
  })
}

export async function getNotes(): Promise<NoteCard[]> {
  const [library, ctx] = await Promise.all([loadLibrary(), getMockContext()])
  return noteCardsOf(library.pages, ctx.timeZone)
}

export async function getCharacterChips(): Promise<CharacterChip[]> {
  const library = await loadLibrary()
  return library.characters.map((character) => chipOf(library, character))
}

// La tarjeta de cada mundo: "2 regiones · 4 reinos · 4 eras · 7 especies".
export async function getWorldCards(): Promise<WorldCard[]> {
  const library = await loadLibrary()
  return library.worlds.map((world) => {
    const bundle = bundleOf(library, world.id)!
    const stat = new Map(statCatalog(bundle).map((item) => [item.id, item]))
    const parts = ['regions', 'kingdoms', 'eras', 'species'].map((id) => stat.get(id)).filter((item) => item && item.value > 0).map((item) => `${item!.value} ${item!.label}`)
    return { id: world.id, name: world.name, countsText: parts.length ? parts.join(' · ') : 'Recién creado' }
  })
}

// --- El editor de una página ------------------------------------------------------------------------------

// Una página para el editor, con su ruta de migas ("Escritos / Aurelun / Un cuento… / 0.- Antecedentes") y, si es
// un capítulo de una historia con mundo, su arco, su era y su punto de vista. null si no existe.
export async function getPageEditor(id: string): Promise<PageEditorView | null> {
  const [library, ctx] = await Promise.all([loadLibrary(), getMockContext()])
  const listed = library.pages.find((item) => item.id === id)
  if (!listed) return null
  const page: PageRecord | null = DEMO_MODE ? { ...listed, content: demoPageContent(ctx, id) ?? emptyDoc() } : await orNull(api.get<PageRecord>(`/writings/pages/${id}`))
  if (!page) return null

  const story = page.storyId ? (library.stories.find((item) => item.id === page.storyId) ?? null) : null
  const bundle = story?.worldId ? bundleOf(library, story.worldId) : null
  const crumbs: Crumb[] = [{ label: 'Escritos', href: '/escritos' }]
  if (page.kind === 'note') {
    crumbs.push({ label: 'Notas', href: '/escritos/notas' })
  } else {
    if (bundle) crumbs.push({ label: bundle.world.name, href: `/escritos/mundos/${bundle.world.id}` })
    if (story) crumbs.push({ label: story.title, href: bundle ? `/escritos/mundos/${bundle.world.id}/historias?historia=${story.id}` : '/escritos' })
  }
  crumbs.push({ label: page.title.trim() || 'Sin título', href: null })

  const chapter =
    page.kind === 'chapter' && story
      ? {
          arcId: page.arcId,
          eraId: page.eraId,
          povCharacterId: page.povCharacterId,
          arcs: story.arcs,
          eras: bundle ? bundle.eras.map((era, index) => ({ id: era.id, name: eraLabel(era, index) })) : [],
          characters: bundle ? bundle.characters.map((character) => ({ id: character.id, name: character.name })) : [],
        }
      : null

  return {
    id: page.id,
    kind: page.kind,
    title: page.title,
    status: page.status,
    tag: page.tag,
    content: (page.content as TiptapDoc | null) ?? emptyDoc(),
    wordCount: page.wordCount,
    crumbs,
    story: story ? { id: story.id, title: story.title, wordGoal: story.wordGoal } : null,
    characters: story ? library.characters.filter((character) => story.cast.includes(character.id)).map((character) => chipOf(library, character)) : [],
    chapter,
    backHref: page.kind === 'note' ? '/escritos/notas' : bundle ? `/escritos/mundos/${bundle.world.id}/historias` : '/escritos',
    savedText: savedTextOf(page.updatedAt, ctx.timeZone),
  }
}

// --- La base de datos de personajes ---------------------------------------------------------------------

// Los personajes de un mundo como filas de una tabla, con los campos de su plantilla como columnas. `mundo` elige el
// mundo (el primero si falta o no existe) y `abrir` deja abierto el panel de un personaje. null sin mundos.
export async function getCharacterDatabase(query: { mundo?: string; abrir?: string } = {}): Promise<CharacterDbView | null> {
  const library = await loadLibrary()
  const ofCharacter = library.characters.find((item) => item.id === query.abrir)?.worldId
  const world = library.worlds.find((item) => item.id === (query.mundo ?? ofCharacter)) ?? library.worlds[0]
  if (!world) return null
  const bundle = bundleOf(library, world.id)!
  const template = templateByKey(bundle, 'character')
  if (!template) return null

  const fields = template.fields.filter((field) => field.kind === 'field')
  const groupField = fields.find((field) => field.type === 'select') ?? null
  const names: Record<string, string> = {}
  for (const item of [...bundle.characters, ...bundle.notes]) names[item.id] = item.name
  bundle.eras.forEach((era, index) => (names[era.id] = eraLabel(era, index)))

  return {
    worlds: library.worlds.map((item) => ({ id: item.id, name: item.name })),
    worldId: world.id,
    worldName: world.name,
    templateId: template.id,
    fields,
    allFields: template.fields,
    groupFieldId: groupField?.id ?? null,
    rows: bundle.characters.map((character) => {
      const chip = chipOf(library, character)
      return {
        id: character.id,
        name: character.name,
        initial: chip.initial,
        tone: chip.tone,
        imageUrl: character.imageUrl,
        groupId: groupField ? String(character.values[groupField.id] ?? '') : '',
        values: character.values,
        summary: character.summary,
        stories: library.stories.filter((story) => story.cast.includes(character.id)).map((story) => story.title),
      }
    }),
    names,
    linkOptions: linkOptions(bundle, null),
    eraOptions: bundle.eras.map((era, position) => ({ id: era.id, label: eraLabel(era, position) })),
    initialOpenId: bundle.characters.some((item) => item.id === query.abrir) ? (query.abrir as string) : null,
  }
}
