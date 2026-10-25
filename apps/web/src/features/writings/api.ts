import 'server-only'

import { mockDelay } from '@/lib/mock/context'

import { loadWritings } from './mock-store'
import type {
  BookView,
  CharacterChip,
  CharacterDbView,
  CharactersTabView,
  CharacterRow,
  Crumb,
  NoteCard,
  PageEditorView,
  RegionsView,
  SpeciesView,
  StoriesTabView,
  TimelineView,
  World,
  WorldCard,
  WorldCharacter,
  WorldHeaderView,
  WorldStoryPanel,
  WorldSummaryView,
  WritingsOverview,
} from './types'
import type { WritingsStore } from './mock-store'
import {
  bookViewOf,
  characterChip,
  groupingFieldOf,
  noteCardsOf,
  plural,
  rowsOf,
  savedTextOf,
  textValueOf,
  weekOf,
} from './writing-utils'
import { gapsOf, matrixOf, worldHeaderOf } from './world-utils'

// Las lecturas de Escritos. Cada una devuelve lo que necesita una pestaña ya armado a partir de las historias,
// las páginas y los mundos: con la API serán `api.get('/writings/...')` y la pantalla recibe la misma forma de
// datos. La meta de palabras por día es un ajuste que todavía no existe (FALTA EN LA BASE): mientras tanto es
// la constante de `shared`.

export async function getWritingsOverview(): Promise<WritingsOverview> {
  await mockDelay()
  const { store, ctx } = await loadWritings()
  const week = weekOf(store.wordsByDay, ctx.today)
  const lastPage = [...store.pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  return {
    worldCount: store.worlds.length,
    bookCount: store.stories.length,
    storyCount: store.stories.filter((story) => story.kind === 'story').length,
    noteCount: store.pages.filter((page) => page.kind === 'note').length,
    characterCount: store.characters.length,
    weekTotal: week.reduce((sum, day) => sum + day.words, 0),
    dailyGoal: store.dailyGoal,
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

// Las historias y los cuadernos, cada uno con sus capítulos o páginas y los personajes que aparecen en él.
export async function getBooks(): Promise<BookView[]> {
  await mockDelay()
  const { store } = await loadWritings()
  return store.stories.map((story) => {
    const world = store.worlds.find((item) => item.id === story.worldId) ?? null
    const chips = store.characters.filter((character) => character.storyIds.includes(story.id)).map((character) => characterChip(character, store.characterFields))
    return bookViewOf(story, store.pages, world, chips)
  })
}

// Una página para el editor, con su ruta de migas ("Escritos / Aurelun / Un cuento… / 0.- Antecedentes"). null si
// no existe.
export async function getPageEditor(id: string): Promise<PageEditorView | null> {
  await mockDelay()
  const { store, ctx } = await loadWritings()
  const page = store.pages.find((item) => item.id === id)
  if (!page) return null

  const story = page.storyId ? (store.stories.find((item) => item.id === page.storyId) ?? null) : null
  const world = story?.worldId ? (store.worlds.find((item) => item.id === story.worldId) ?? null) : null
  const crumbs: Crumb[] = [{ label: 'Escritos', href: '/escritos' }]
  if (page.kind === 'note') {
    crumbs.push({ label: 'Notas', href: '/escritos/notas' })
  } else {
    if (world) crumbs.push({ label: world.name, href: `/escritos/mundos/${world.id}` })
    if (story) crumbs.push({ label: story.title, href: '/escritos' })
  }
  crumbs.push({ label: page.title.trim() || 'Sin título', href: null })

  return {
    id: page.id,
    kind: page.kind,
    title: page.title,
    status: page.status,
    tag: page.tag,
    content: page.content,
    wordCount: page.wordCount,
    crumbs,
    story: story ? { id: story.id, title: story.title, wordGoal: story.wordGoal } : null,
    characters: store.characters.filter((character) => page.characterIds.includes(character.id)).map((character) => characterChip(character, store.characterFields)),
    backHref: page.kind === 'note' ? '/escritos/notas' : '/escritos',
    savedText: savedTextOf(page.updatedAt, ctx.timeZone),
  }
}

export async function getNotes(): Promise<NoteCard[]> {
  await mockDelay()
  const { store, ctx } = await loadWritings()
  return noteCardsOf(store.pages, ctx.timeZone)
}

export async function getCharacterChips(): Promise<CharacterChip[]> {
  await mockDelay()
  const { store } = await loadWritings()
  return store.characters.map((character) => characterChip(character, store.characterFields))
}

export async function getWorldCards(): Promise<WorldCard[]> {
  await mockDelay()
  const { store } = await loadWritings()
  return store.worlds.map((world) => {
    const kingdoms = world.regions.reduce((sum, region) => sum + region.kingdoms.length, 0)
    const parts = [
      world.regions.length ? plural(world.regions.length, 'región', 'regiones') : null,
      kingdoms ? plural(kingdoms, 'reino', 'reinos') : null,
      world.eras.length ? plural(world.eras.length, 'era', 'eras') : null,
      world.species.length ? plural(world.species.length, 'especie', 'especies') : null,
    ].filter(Boolean)
    return { id: world.id, name: world.name, countsText: parts.length ? parts.join(' · ') : 'Recién creado' }
  })
}

// --- La página de un mundo ------------------------------------------------------------------------
// Cada pestaña del mundo (Resumen, Línea del tiempo, Regiones, Historias, Personajes, Especies) pide solo lo suyo.
// Todas devuelven null si el mundo no existe (o no es tuyo), y la ruta responde con "no encontrado".

async function loadWorld(id: string): Promise<{ store: WritingsStore; world: World } | null> {
  await mockDelay()
  const { store } = await loadWritings()
  const world = store.worlds.find((item) => item.id === id)
  return world ? { store, world } : null
}

export async function getWorldHeader(id: string): Promise<WorldHeaderView | null> {
  const found = await loadWorld(id)
  if (!found) return null
  const { store, world } = found
  return worldHeaderOf(world, store.characters.filter((character) => character.worldId === world.id).length)
}

export async function getWorldSummary(id: string): Promise<WorldSummaryView | null> {
  const found = await loadWorld(id)
  if (!found) return null
  const { store, world } = found
  const base = `/escritos/mundos/${world.id}`
  const stories = store.stories.filter((story) => story.worldId === world.id)
  return {
    worldId: world.id,
    worldName: world.name,
    eras: world.eras.map((era) => ({ id: era.id, number: era.number, shortName: era.shortName, href: `${base}/linea-del-tiempo?era=${era.id}` })),
    rows: matrixOf(world, stories, { timeline: (eraId) => `${base}/linea-del-tiempo?era=${eraId}`, stories: `${base}/historias` }),
    gaps: gapsOf(world),
    rules: world.rules,
  }
}

export async function getWorldTimeline(id: string, eraParam?: string): Promise<TimelineView | null> {
  const found = await loadWorld(id)
  if (!found) return null
  const { world } = found
  const initial = world.eras.find((era) => era.id === eraParam) ?? world.eras[0]
  return { worldId: world.id, eras: world.eras, initialEraId: initial?.id ?? null }
}

export async function getWorldRegions(id: string): Promise<RegionsView | null> {
  const found = await loadWorld(id)
  if (!found) return null
  const { store, world } = found
  const field = groupingFieldOf(store.characterFields, world.id)
  const regions = world.regions.map((region) => ({
    ...region,
    kingdomLinks: region.kingdoms.map((name) => {
      const option = field?.options.find((item) => item.label.toLowerCase() === name.toLowerCase())
      const count = option && field ? store.characters.filter((character) => character.worldId === world.id && character.values[field.id] === option.id).length : 0
      return { name, countText: plural(count, 'personaje', 'personajes'), href: `/escritos/mundos/${world.id}/personajes${option ? `?reino=${option.id}` : ''}` }
    }),
  }))
  return { worldId: world.id, regions, hasMap: world.hasMap }
}

export async function getWorldStories(id: string): Promise<StoriesTabView | null> {
  const found = await loadWorld(id)
  if (!found) return null
  const { store, world } = found
  const eraLabelOf = (eraId: string | null) => {
    const era = world.eras.find((item) => item.id === eraId)
    return era ? `Era ${era.number} · ${era.shortName}` : null
  }
  const regionNameOf = (regionId: string | null) => world.regions.find((item) => item.id === regionId)?.name ?? null

  const stories: WorldStoryPanel[] = store.stories
    .filter((story) => story.worldId === world.id)
    .map((story) => ({
      id: story.id,
      title: story.title,
      initial: story.title.trim().charAt(0).toUpperCase() || '?',
      color: story.color,
      eraLabel: eraLabelOf(story.eraId),
      regionName: regionNameOf(story.regionId),
      summary: story.summary,
      chapters: rowsOf(story, store.pages),
      leads: store.characters.filter((character) => character.storyIds.includes(story.id)).map((character) => characterChip(character, store.characterFields)),
      resources: story.resources,
    }))
  const ideas = world.ideas.map((idea) => ({ ...idea, eraLabel: eraLabelOf(idea.eraId) ?? '', regionName: regionNameOf(idea.regionId) }))
  return { worldId: world.id, stories, ideas }
}

export async function getWorldCharacters(id: string, query: { reino?: string; personaje?: string } = {}): Promise<CharactersTabView | null> {
  const found = await loadWorld(id)
  if (!found) return null
  const { store, world } = found
  const field = groupingFieldOf(store.characterFields, world.id)
  const own = store.characters.filter((character) => character.worldId === world.id)

  const characters: WorldCharacter[] = own.map((character) => {
    const chip = characterChip(character, store.characterFields)
    const groupId = field ? String(character.values[field.id] ?? '') : ''
    const role = textValueOf(character, store.characterFields, 'Rol')
    const era = textValueOf(character, store.characterFields, 'Era')
    return {
      ...chip,
      groupId,
      placeText: [chip.kingdomLabel, role].filter(Boolean).join(' · '),
      tags: [role, chip.kingdomLabel, era].filter(Boolean),
      metaText: field && chip.kingdomLabel ? `${field.name}: ${chip.kingdomLabel}` : 'Personaje',
      description: character.description,
    }
  })
  const groups = [
    { id: 'all', label: 'Todos', count: characters.length },
    ...(field?.options ?? []).map((option) => ({ id: option.id, label: option.label, count: characters.filter((character) => character.groupId === option.id).length })),
  ]
  const initialGroup = groups.some((group) => group.id === query.reino) ? (query.reino as string) : 'all'
  // La ficha que se abre: la de la dirección, o la primera del grupo que se está viendo.
  const inGroup = characters.filter((character) => initialGroup === 'all' || character.groupId === initialGroup)
  const initialCharacterId = characters.some((character) => character.id === query.personaje) ? (query.personaje as string) : (inGroup[0]?.id ?? characters[0]?.id ?? null)
  return { worldId: world.id, groupLabel: field?.name ?? 'Grupo', groups, characters, initialGroup, initialCharacterId }
}

export async function getWorldSpecies(id: string): Promise<SpeciesView | null> {
  const found = await loadWorld(id)
  if (!found) return null
  const { world } = found
  return {
    worldId: world.id,
    species: world.species.map((item) => {
      const region = world.regions.find((candidate) => candidate.id === item.regionId)
      return { ...item, regionName: region?.name ?? '', dark: region?.dark ?? false }
    }),
  }
}

// --- La base de datos de personajes -------------------------------------------------------------

// Los personajes de un mundo como filas de una tabla, con sus columnas. `mundo` elige el mundo (el primero si falta o
// no existe) y `abrir` deja abierto el panel de un personaje. null si todavía no hay ningún mundo.
export async function getCharacterDatabase(query: { mundo?: string; abrir?: string } = {}): Promise<CharacterDbView | null> {
  await mockDelay()
  const { store } = await loadWritings()
  // Sin `?mundo=`, se abre el mundo del personaje que pide `?abrir=`, o el primero.
  const ofCharacter = store.characters.find((item) => item.id === query.abrir)?.worldId
  const world = store.worlds.find((item) => item.id === (query.mundo ?? ofCharacter)) ?? store.worlds[0]
  if (!world) return null

  const fields = store.characterFields.filter((field) => field.worldId === world.id)
  const groupField = groupingFieldOf(store.characterFields, world.id)
  const rows: CharacterRow[] = store.characters
    .filter((character) => character.worldId === world.id)
    .map((character) => {
      const chip = characterChip(character, store.characterFields)
      return {
        id: character.id,
        name: character.name,
        initial: chip.initial,
        tone: chip.tone,
        groupId: groupField ? String(character.values[groupField.id] ?? '') : '',
        values: character.values,
        description: character.description,
        stories: character.storyIds.map((storyId) => store.stories.find((story) => story.id === storyId)?.title).filter((title): title is string => Boolean(title)),
        pageId: character.pageId,
      }
    })
  return {
    worlds: store.worlds.map((item) => ({ id: item.id, name: item.name })),
    worldId: world.id,
    worldName: world.name,
    fields,
    groupFieldId: groupField?.id ?? null,
    rows,
    initialOpenId: rows.some((row) => row.id === query.abrir) ? (query.abrir as string) : null,
  }
}
