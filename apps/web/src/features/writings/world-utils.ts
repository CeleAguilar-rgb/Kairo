import { DEFAULT_WORLD_STATS, PLACE_TYPE_KINGDOM, PLACE_TYPE_REGION, WORLD_CORE_STATS, WORLD_CORE_TABS, type OptionTone, type WorldCoreStat, type WorldCoreTab } from '@kairo/shared'

import type { CharacterRecord, Entry, EraRecord, EventRecord, NoteRecord, NoteTemplate, StoryRecord, TemplateField, WorldBundle } from './types'
import { initialOf, plural, shortNameOf } from './writing-utils'

// La lógica de la página de un mundo (Escritos.dc.html) que no es de pantalla: qué pestañas van en la barra, qué
// se cuenta en la portada, quién menciona a quién, la tabla "Dónde y cuándo", los huecos por llenar y los grupos
// de personajes. Todo sale del WorldBundle (lo que devuelve la API, sin calcular nada guardado): son funciones
// puras, así se prueban sin abrir nada.

export const worldHref = (worldId: string) => `/escritos/mundos/${worldId}`

// --- Números romanos de las eras ------------------------------------------------------------------------

const ROMAN: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

// La era 1 es "I", la 4 es "IV": el número no se guarda, sale de su lugar en la línea del tiempo.
export function romanOf(position: number): string {
  let value = position + 1
  let out = ''
  for (const [amount, letters] of ROMAN) {
    while (value >= amount) {
      out += letters
      value -= amount
    }
  }
  return out
}

export const eraLabel = (era: EraRecord, index: number) => `Era ${romanOf(index)} · ${era.shortName || era.name}`

// --- Plantillas y fichas -------------------------------------------------------------------------------

export const templateByKey = (bundle: WorldBundle, key: 'character' | 'species' | 'place') => bundle.templates.find((template) => template.key === key) ?? null

// Las secciones extra (Magia, Objetos…): las plantillas sin `key`.
export const sectionTemplates = (bundle: WorldBundle) => bundle.templates.filter((template) => !template.key)

// Personajes y notas juntos, con de qué tabla viene cada uno.
export function entriesOf(bundle: WorldBundle): Entry[] {
  return [...bundle.characters.map((item) => ({ kind: 'character' as const, ...item })), ...bundle.notes.map((item) => ({ kind: 'note' as const, ...item }))]
}

export function entryIndex(bundle: WorldBundle): Map<string, Entry> {
  return new Map(entriesOf(bundle).map((entry) => [entry.id, entry]))
}

export function templateOfEntry(bundle: WorldBundle, entry: Entry): NoteTemplate | null {
  return entry.kind === 'character' ? templateByKey(bundle, 'character') : (bundle.templates.find((template) => template.id === entry.templateId) ?? null)
}

// El nombre con el que se ve algo enlazado (en chips y textos): el corto de un personaje o el de una nota.
export function displayName(entry: Entry): string {
  return entry.kind === 'character' ? shortNameOf(entry.name) : entry.name
}

export const fieldByKey = (template: NoteTemplate | null, key: TemplateField['key']) => template?.fields.find((field) => field.key === key) ?? null

// Los ids que una ficha enlaza en sus campos de tipo vínculo.
export function linksOf(entry: Entry, template: NoteTemplate | null): string[] {
  if (!template) return []
  return template.fields.filter((field) => field.kind === 'field' && field.type === 'link').flatMap((field) => {
    const value = entry.values[field.id]
    return Array.isArray(value) ? value : []
  })
}

// --- Lugares ----------------------------------------------------------------------------------------

export const placesOf = (bundle: WorldBundle) => {
  const template = templateByKey(bundle, 'place')
  return template ? bundle.notes.filter((note) => note.templateId === template.id) : []
}

// El tipo de un lugar (el id de la opción de "Tipo de lugar": 'region', 'kingdom', 'forest'…), o null.
export function placeTypeOf(bundle: WorldBundle, note: NoteRecord): string | null {
  const field = fieldByKey(templateByKey(bundle, 'place'), 'place_type')
  const value = field ? note.values[field.id] : null
  return typeof value === 'string' ? value : null
}

export function placeTypeLabel(bundle: WorldBundle, note: NoteRecord): string {
  const field = fieldByKey(templateByKey(bundle, 'place'), 'place_type')
  const type = placeTypeOf(bundle, note)
  return field?.options.find((option) => option.id === type)?.label ?? 'Lugar'
}

// Una región es un lugar de primer nivel de tipo Región (o sin tipo todavía). Los demás de primer nivel (La
// Muralla) van aparte, como "Otros lugares".
export function regionsOf(bundle: WorldBundle): NoteRecord[] {
  return placesOf(bundle).filter((note) => !note.parentId && [PLACE_TYPE_REGION, null].includes(placeTypeOf(bundle, note)))
}

export function otherTopPlaces(bundle: WorldBundle): NoteRecord[] {
  const regions = new Set(regionsOf(bundle).map((note) => note.id))
  return placesOf(bundle).filter((note) => !note.parentId && !regions.has(note.id))
}

export const childrenOf = (bundle: WorldBundle, noteId: string) => bundle.notes.filter((note) => note.parentId === noteId)

// El lugar y todos los que tiene dentro (para saber qué pasa "en Vadronia" aunque el evento diga "Sudria").
export function placeAndInside(bundle: WorldBundle, noteId: string): Set<string> {
  const ids = new Set([noteId])
  let grew = true
  while (grew) {
    grew = false
    for (const note of bundle.notes) {
      if (note.parentId && ids.has(note.parentId) && !ids.has(note.id)) {
        ids.add(note.id)
        grew = true
      }
    }
  }
  return ids
}

// Subiendo por los "padres" de un lugar hasta encontrar un reino (El castillo → Sudria).
function kingdomUp(bundle: WorldBundle, byId: Map<string, NoteRecord>, noteId: string): NoteRecord | null {
  let cursor = byId.get(noteId) ?? null
  for (let steps = 0; cursor && steps < 50; steps += 1) {
    if (placeTypeOf(bundle, cursor) === PLACE_TYPE_KINGDOM) return cursor
    cursor = cursor.parentId ? (byId.get(cursor.parentId) ?? null) : null
  }
  return null
}

// El reino de un personaje: el primero al que lleva alguno de sus vínculos (Lugar de origen → Sudria). Con él se
// filtran los personajes y se pinta el círculo, como en el canvas.
export function kingdomOf(bundle: WorldBundle, character: CharacterRecord): NoteRecord | null {
  const template = templateByKey(bundle, 'character')
  const byId = new Map(bundle.notes.map((note) => [note.id, note]))
  for (const id of linksOf({ kind: 'character', ...character }, template)) {
    const kingdom = kingdomUp(bundle, byId, id)
    if (kingdom) return kingdom
  }
  return null
}

// Los colores de los reinos, en orden (los del canvas: arena, lavanda suave, crema, lavanda).
const KINGDOM_TONES: OptionTone[] = ['warm', 'soft', 'muted', 'accent']

export function kingdomTone(bundle: WorldBundle, kingdomId: string | null): OptionTone {
  if (!kingdomId) return 'ink'
  const kingdoms = placesOf(bundle).filter((note) => placeTypeOf(bundle, note) === PLACE_TYPE_KINGDOM)
  const index = kingdoms.findIndex((note) => note.id === kingdomId)
  return KINGDOM_TONES[(index === -1 ? 0 : index) % KINGDOM_TONES.length]!
}

// Los filtros de la pestaña Personajes: Todos, cada reino con personajes y "Otros" para los que no tienen reino.
export function characterGroups(bundle: WorldBundle): { id: string; label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const character of bundle.characters) {
    const id = kingdomOf(bundle, character)?.id ?? 'others'
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const kingdoms = placesOf(bundle).filter((note) => counts.has(note.id))
  return [
    { id: 'all', label: 'Todos', count: bundle.characters.length },
    ...kingdoms.map((note) => ({ id: note.id, label: note.name, count: counts.get(note.id) ?? 0 })),
    ...(counts.has('others') ? [{ id: 'others', label: 'Otros', count: counts.get('others') ?? 0 }] : []),
  ]
}

// Lo que se lee bajo el nombre de un personaje: su reino y su rol ("Sudria · Protagonista").
export function characterPlace(bundle: WorldBundle, character: CharacterRecord): string {
  const role = fieldByKey(templateByKey(bundle, 'character'), 'role')
  const roleText = role ? character.values[role.id] : null
  const kingdom = kingdomOf(bundle, character)?.name
  return [kingdom, typeof roleText === 'string' ? roleText : null].filter(Boolean).join(' · ') || 'Personaje'
}

export const characterInitial = (character: CharacterRecord) => initialOf(character.name)

// --- Pestañas ---------------------------------------------------------------------------------------

export type WorldTab = { id: string; label: string; href: string; template: NoteTemplate | null }

const CORE_TAB: Record<WorldCoreTab, { label: string; slug: string }> = {
  resumen: { label: 'Resumen', slug: '' },
  timeline: { label: 'Línea del tiempo', slug: '/linea-del-tiempo' },
  regions: { label: 'Regiones', slug: '/regiones' },
  stories: { label: 'Historias', slug: '/historias' },
  characters: { label: 'Personajes', slug: '/personajes' },
  species: { label: 'Especies', slug: '/especies' },
}

// Todas las pestañas del mundo: las fijas y una por sección extra (`tpl:<id>`).
export function allTabs(bundle: WorldBundle): WorldTab[] {
  const base = worldHref(bundle.world.id)
  return [
    ...WORLD_CORE_TABS.map((id) => ({ id, label: CORE_TAB[id].label, href: `${base}${CORE_TAB[id].slug}`, template: null })),
    ...sectionTemplates(bundle).map((template) => ({ id: `tpl:${template.id}`, label: template.name, href: `${base}/seccion/${template.id}`, template })),
  ]
}

// Las de la barra (en el orden guardado; sin guardar, las fijas) y las que quedan en "Más". El Resumen siempre va.
export function splitTabs(bundle: WorldBundle): { bar: WorldTab[]; more: WorldTab[] } {
  const all = allTabs(bundle)
  const byId = new Map(all.map((tab) => [tab.id, tab]))
  const saved = (bundle.world.tabs ?? [...WORLD_CORE_TABS]).filter((id) => byId.has(id))
  const order = saved.includes('resumen') ? saved : ['resumen', ...saved]
  const bar = order.map((id) => byId.get(id)!)
  return { bar, more: all.filter((tab) => !order.includes(tab.id)) }
}

export const tabIdsOf = (bundle: WorldBundle) => splitTabs(bundle).bar.map((tab) => tab.id)

// --- Contadores de la portada ------------------------------------------------------------------------

export type WorldStat = { id: string; label: string; value: number }

const CORE_STAT_LABEL: Record<WorldCoreStat, [string, string]> = {
  eras: ['era', 'eras'],
  events: ['evento', 'eventos'],
  regions: ['región', 'regiones'],
  kingdoms: ['reino', 'reinos'],
  places: ['lugar', 'lugares'],
  species: ['especie', 'especies'],
  characters: ['personaje', 'personajes'],
  stories: ['historia', 'historias'],
  chapters: ['capítulo', 'capítulos'],
}

// Todo lo que se puede contar, con su cuenta. Las cuentas no se guardan: salen de lo que hay.
export function statCatalog(bundle: WorldBundle): WorldStat[] {
  const species = templateByKey(bundle, 'species')
  const places = placesOf(bundle)
  const value: Record<WorldCoreStat, number> = {
    eras: bundle.eras.length,
    events: bundle.events.length,
    regions: places.filter((note) => placeTypeOf(bundle, note) === PLACE_TYPE_REGION).length,
    kingdoms: places.filter((note) => placeTypeOf(bundle, note) === PLACE_TYPE_KINGDOM).length,
    places: places.length,
    species: species ? bundle.notes.filter((note) => note.templateId === species.id).length : 0,
    characters: bundle.characters.length,
    stories: bundle.stories.length,
    chapters: bundle.chapters.length,
  }
  return [
    ...WORLD_CORE_STATS.map((id) => ({ id, label: value[id] === 1 ? CORE_STAT_LABEL[id][0] : CORE_STAT_LABEL[id][1], value: value[id] })),
    ...sectionTemplates(bundle).map((template) => ({ id: `tpl:${template.id}`, label: template.name.toLowerCase(), value: sectionEntries(bundle, template.id).length })),
  ]
}

// Los que se ven en la portada, en su orden (sin guardar, los del canvas).
export function statsOf(bundle: WorldBundle): WorldStat[] {
  const byId = new Map(statCatalog(bundle).map((stat) => [stat.id, stat]))
  return (bundle.world.stats ?? [...DEFAULT_WORLD_STATS]).flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
}

// Lo que se ve en una sección extra: sus notas y los personajes que también aparecen ahí (la Luna en Deidades).
export function sectionEntries(bundle: WorldBundle, templateId: string): Entry[] {
  return [
    ...bundle.notes.filter((note) => note.templateId === templateId).map((note) => ({ kind: 'note' as const, ...note })),
    ...bundle.characters.filter((character) => character.sections.includes(templateId)).map((character) => ({ kind: 'character' as const, ...character })),
  ]
}

// --- "Lo mencionan" ---------------------------------------------------------------------------------

export type Mention = { id: string; label: string; target: { kind: 'entry'; id: string } | { kind: 'event'; id: string } | { kind: 'story'; id: string } }

// Quién nombra a una ficha: otras fichas que la enlazan, los eventos donde participa o pasa, y las historias donde
// sale. No se guarda: se calcula con todo el mundo, que la pantalla ya tiene cargado (decisión #45).
export function mentionsOf(bundle: WorldBundle, id: string): Mention[] {
  const out: Mention[] = []
  for (const entry of entriesOf(bundle)) {
    if (entry.id === id) continue
    if (linksOf(entry, templateOfEntry(bundle, entry)).includes(id)) out.push({ id: entry.id, label: displayName(entry), target: { kind: 'entry', id: entry.id } })
  }
  bundle.eras.forEach((era, index) => {
    for (const event of bundle.events.filter((item) => item.eraId === era.id)) {
      if (event.who.includes(id) || event.where.includes(id)) out.push({ id: event.id, label: `Era ${romanOf(index)} · ${event.title}`, target: { kind: 'event', id: event.id } })
    }
  })
  for (const story of bundle.stories) {
    if (story.cast.includes(id) || story.placeId === id) out.push({ id: story.id, label: story.title, target: { kind: 'story', id: story.id } })
  }
  return out
}

// "Con Krandalf, Cross · en Vadronia · 2 notas" (debajo de cada evento de la línea del tiempo).
export function eventMeta(bundle: WorldBundle, event: EventRecord, index: Map<string, Entry>): string {
  const names = (ids: string[]) => ids.flatMap((id) => (index.has(id) ? [displayName(index.get(id)!)] : []))
  const who = names(event.who)
  const where = names(event.where)
  return [who.length ? `Con ${who.join(', ')}` : null, where.length ? `en ${where.join(', ')}` : null, event.notes.length ? plural(event.notes.length, 'nota', 'notas') : null].filter(Boolean).join(' · ')
}

// --- "Dónde y cuándo" (la tabla del Resumen) --------------------------------------------------------------

export type MatrixItem = { id: string; label: string; kind: 'story' | 'lore' | 'idea'; target: Mention['target'] }
export type MatrixRow = { id: string; name: string; sub: string; cells: { eraId: string; items: MatrixItem[] }[] }

// Cada región (y "Todo <mundo>") en cada era: las historias que pasan ahí (las ideas, punteadas) y los eventos que
// pasan ahí ("lore"). Un evento sin dónde, o una historia sin lugar, van a "Todo <mundo>".
export function matrixOf(bundle: WorldBundle): MatrixRow[] {
  const regions = regionsOf(bundle)
  const areas = regions.map((region) => ({ region, ids: placeAndInside(bundle, region.id) }))
  const regionOf = (placeId: string | null) => (placeId ? (areas.find((area) => area.ids.has(placeId))?.region.id ?? null) : null)

  const cellItems = (regionId: string | null, era: EraRecord): MatrixItem[] => {
    const stories = bundle.stories
      .filter((story) => story.eraId === era.id && regionOf(story.placeId) === regionId)
      .map((story): MatrixItem => ({ id: story.id, label: story.title, kind: story.status === 'idea' ? 'idea' : 'story', target: { kind: 'story', id: story.id } }))
    const events = bundle.events
      .filter((event) => event.eraId === era.id)
      .filter((event) => {
        const found = event.where.map(regionOf).filter((item): item is string => Boolean(item))
        return regionId ? found.includes(regionId) : found.length === 0
      })
      .map((event): MatrixItem => ({ id: event.id, label: event.title, kind: 'lore', target: { kind: 'event', id: event.id } }))
    return [...stories, ...events]
  }

  const species = templateByKey(bundle, 'species')
  const home = fieldByKey(species, 'home')
  const peoplesOf = (region: NoteRecord) => {
    const ids = placeAndInside(bundle, region.id)
    return bundle.notes.filter((note) => note.templateId === species?.id && home && Array.isArray(note.values[home.id]) && (note.values[home.id] as string[]).some((id) => ids.has(id))).map((note) => note.name.toLowerCase())
  }
  const kingdomsIn = (region: NoteRecord) => childrenOf(bundle, region.id).filter((note) => placeTypeOf(bundle, note) === PLACE_TYPE_KINGDOM).length

  return [
    { id: 'all', name: `Todo ${bundle.world.name}`, sub: 'El mundo entero', cells: bundle.eras.map((era) => ({ eraId: era.id, items: cellItems(null, era) })) },
    ...regions.map((region) => {
      const kingdoms = kingdomsIn(region)
      const peoples = peoplesOf(region)
      const sub = [kingdoms ? plural(kingdoms, 'reino', 'reinos') : null, peoples.length ? peoples.slice(0, 3).join(', ') : null].filter(Boolean).join(' · ')
      return { id: region.id, name: region.name, sub: sub || placeTypeLabel(bundle, region), cells: bundle.eras.map((era) => ({ eraId: era.id, items: cellItems(region.id, era) })) }
    }),
  ]
}

// --- Huecos por llenar --------------------------------------------------------------------------------

export type WorldGap = { id: string; title: string; detail: string; target: Mention['target'] | null }

// Lo que falta, sacado de lo que hay: eras sin eventos, regiones sin descripción, fichas en borrador y el mapa.
export function gapsOf(bundle: WorldBundle): WorldGap[] {
  const gaps: WorldGap[] = []
  const emptyEras = bundle.eras.map((era, index) => ({ era, index })).filter(({ era }) => !bundle.events.some((event) => event.eraId === era.id))
  if (emptyEras.length > 0) {
    gaps.push({
      id: 'eras',
      title: emptyEras.length === 1 ? `Eventos de la Era ${romanOf(emptyEras[0]!.index)}` : `Eventos de las Eras ${emptyEras.map(({ index }) => romanOf(index)).join(' y ')}`,
      detail: emptyEras.length === 1 ? 'Todavía no tiene eventos.' : 'Todavía no tienen eventos.',
      target: null,
    })
  }
  for (const region of regionsOf(bundle).filter((note) => !note.summary.trim())) {
    gaps.push({ id: `region-${region.id}`, title: `Página de ${region.name}`, detail: 'Todavía no tiene descripción.', target: { kind: 'entry', id: region.id } })
  }
  for (const entry of entriesOf(bundle).filter((item) => item.draft).slice(0, 4)) {
    gaps.push({ id: `draft-${entry.id}`, title: displayName(entry), detail: 'Sigue en borrador.', target: { kind: 'entry', id: entry.id } })
  }
  if (!bundle.world.mapUrl) gaps.push({ id: 'map', title: 'Mapa del mundo', detail: 'Súbelo en la pestaña Regiones.', target: null })
  return gaps
}

// --- Recuadros del Resumen ------------------------------------------------------------------------------

export type BoxChip = { id: string; label: string; dashed: boolean; target: Mention['target'] }
export type SummaryBox = { tabId: string; title: string; href: string; groups: { label: string; items: BoxChip[] }[] }

const roleKind = (role: string) => (/protagonista/i.test(role) ? 'lead' : /antagonista/i.test(role) ? 'villain' : role ? 'other' : null)

// Un recuadro por pestaña que esté en la barra: Personajes (protagonistas, antagonistas, secundarios), Especies por
// región, cada sección extra, Regiones (y en borrador) e Historias (en curso e ideas).
export function boxesOf(bundle: WorldBundle): SummaryBox[] {
  const tabs = new Map(splitTabs(bundle).bar.map((tab) => [tab.id, tab]))
  const chip = (entry: Entry): BoxChip => ({ id: entry.id, label: displayName(entry), dashed: entry.draft, target: { kind: 'entry', id: entry.id } })
  const boxes: SummaryBox[] = []

  if (tabs.has('characters')) {
    const role = fieldByKey(templateByKey(bundle, 'character'), 'role')
    const byRole = (kind: string) =>
      bundle.characters.filter((character) => role && roleKind(String(character.values[role.id] ?? '')) === kind).map((character) => chip({ kind: 'character', ...character }))
    boxes.push({
      tabId: 'characters',
      title: tabs.get('characters')!.label,
      href: tabs.get('characters')!.href,
      groups: [
        { label: 'Protagonistas', items: byRole('lead') },
        { label: 'Antagonistas', items: byRole('villain') },
        { label: 'Secundarios importantes', items: byRole('other') },
      ],
    })
  }
  if (tabs.has('species')) {
    const species = templateByKey(bundle, 'species')
    const home = fieldByKey(species, 'home')
    const all = bundle.notes.filter((note) => note.templateId === species?.id)
    const regions = regionsOf(bundle)
    const regionOfSpecies = (note: NoteRecord) => {
      const ids = home && Array.isArray(note.values[home.id]) ? (note.values[home.id] as string[]) : []
      return regions.find((region) => ids.some((id) => placeAndInside(bundle, region.id).has(id)))?.id ?? null
    }
    boxes.push({
      tabId: 'species',
      title: tabs.get('species')!.label,
      href: tabs.get('species')!.href,
      groups: [
        ...regions.map((region) => ({ label: region.name, items: all.filter((note) => regionOfSpecies(note) === region.id).map((note) => chip({ kind: 'note', ...note })) })),
        { label: regions.length ? 'Sin región' : '', items: all.filter((note) => !regionOfSpecies(note)).map((note) => chip({ kind: 'note', ...note })) },
      ],
    })
  }
  for (const template of sectionTemplates(bundle)) {
    const tab = tabs.get(`tpl:${template.id}`)
    if (tab) boxes.push({ tabId: tab.id, title: tab.label, href: tab.href, groups: [{ label: '', items: sectionEntries(bundle, template.id).map(chip) }] })
  }
  if (tabs.has('regions')) {
    boxes.push({
      tabId: 'regions',
      title: tabs.get('regions')!.label,
      href: tabs.get('regions')!.href,
      groups: [
        { label: 'Regiones', items: regionsOf(bundle).map((note) => chip({ kind: 'note', ...note })) },
        { label: 'Otros lugares', items: otherTopPlaces(bundle).map((note) => chip({ kind: 'note', ...note })) },
      ],
    })
  }
  if (tabs.has('stories')) {
    const storyChip = (story: StoryRecord, dashed: boolean): BoxChip => ({ id: story.id, label: story.title, dashed, target: { kind: 'story', id: story.id } })
    boxes.push({
      tabId: 'stories',
      title: tabs.get('stories')!.label,
      href: tabs.get('stories')!.href,
      groups: [
        { label: 'En curso', items: bundle.stories.filter((story) => story.status !== 'idea').map((story) => storyChip(story, false)) },
        { label: 'Ideas', items: bundle.stories.filter((story) => story.status === 'idea').map((story) => storyChip(story, true)) },
      ],
    })
  }
  return boxes.map((box) => ({ ...box, groups: box.groups.filter((group) => group.items.length > 0) }))
}

// --- Fichas -----------------------------------------------------------------------------------------

// "3 de 5 secciones llenas" en la tarjeta de una especie.
export function filledSections(entry: Entry, template: NoteTemplate | null): { filled: number; total: number } {
  const sections = template?.fields.filter((field) => field.kind === 'section') ?? []
  const filled = sections.filter((field) => {
    const value = entry.values[field.id]
    return typeof value === 'string' && value.trim().length > 0
  }).length
  return { filled, total: sections.length }
}

// Las opciones para "+ Enlazar…": todo lo del mundo menos la propia ficha, con su tipo ("Hadas · Especie").
export function linkOptions(bundle: WorldBundle, exceptId: string | null): { id: string; label: string }[] {
  return entriesOf(bundle)
    .filter((entry) => entry.id !== exceptId)
    .map((entry) => ({ id: entry.id, label: `${entry.name} · ${templateOfEntry(bundle, entry)?.name ?? 'Nota'}` }))
}

// Las opciones de "Dónde pasa": solo lugares.
export const placeOptions = (bundle: WorldBundle) => placesOf(bundle).map((note) => ({ id: note.id, label: note.name }))

// La especie que le toca a cada dibujo del canvas, por su nombre (las demás llevan el dibujo genérico).
export type SpeciesDoodle = 'fairy' | 'human' | 'shifter' | 'vampire' | 'wolf' | 'witch' | 'dragon' | 'other'

const SPECIES_DOODLES: [RegExp, SpeciesDoodle][] = [
  [/hada/i, 'fairy'],
  [/human/i, 'human'],
  [/cambiaforma/i, 'shifter'],
  [/vampir/i, 'vampire'],
  [/lobo/i, 'wolf'],
  [/bruj/i, 'witch'],
  [/drag[oó]n/i, 'dragon'],
]

export const speciesDoodleOf = (name: string): SpeciesDoodle => SPECIES_DOODLES.find(([pattern]) => pattern.test(name))?.[1] ?? 'other'

// Un lugar "de noche" (Nocturnia): su portada es de color tinta. Su tarjeta va oscura, con el paisaje de noche, y las
// especies que viven ahí también salen en tarjeta oscura, como en el canvas. Se elige desde la portada del lugar.
export function isDarkPlace(note: NoteRecord | null | undefined): boolean {
  return Boolean(note && note.cover.mode === 'color' && note.cover.color === 'ink')
}

export function homeRegionOf(bundle: WorldBundle, entry: Entry): NoteRecord | null {
  const template = templateOfEntry(bundle, entry)
  const home = fieldByKey(template, 'home')
  const ids = home && Array.isArray(entry.values[home.id]) ? (entry.values[home.id] as string[]) : []
  return regionsOf(bundle).find((region) => ids.some((id) => placeAndInside(bundle, region.id).has(id))) ?? null
}
