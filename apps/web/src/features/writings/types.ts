import type { FieldType, OptionTone, PageKind, PageStatus, StoryColor, StoryKind, TiptapDoc } from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'

// Las tablas de Escritos de docs/guides/data-model.md (camelCase). Lo que el canvas pide y la base de datos
// todavía no tiene (eras, regiones, especies, etiquetas de notas, registro diario de palabras…) está marcado
// con "FALTA EN LA BASE" y listado en la nota de sesión, para la migración.
export type { OptionTone, PageKind, PageStatus, StoryColor, StoryKind }

export const STORY_KIND_LABEL: Record<StoryKind, string> = {
  story: 'Historia',
  notebook: 'Cuaderno',
}

export const PAGE_STATUS_LABEL: Record<PageStatus, string> = {
  none: 'Sin estado',
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Listo',
}

// --- Historias, cuadernos y páginas -------------------------------------------------------------

export type Story = {
  id: string
  title: string
  kind: StoryKind
  summary: string
  color: StoryColor
  // Sin meta no hay barra de avance.
  wordGoal: number | null
  worldId: string | null
  // FALTA EN LA BASE: en qué era y en qué región del mundo pasa la historia (la matriz del Resumen del mundo).
  eraId: string | null
  regionId: string | null
  // FALTA EN LA BASE: el material de la historia (enlaces a lo que la inspira).
  resources: StoryResource[]
}

export type StoryResource = { id: string; name: string; initial: string; tone: OptionTone; url: string }

// Una página: un capítulo, una nota rápida o una página suelta. `content` es el JSON de Tiptap (regla 10).
export type WritingPage = {
  id: string
  storyId: string | null
  kind: PageKind
  title: string
  content: TiptapDoc
  status: PageStatus
  // Se calcula del contenido al guardar (la API lo hará en `pages.word_count`).
  wordCount: number
  // Igual que Proyectos: "preset:<clave>" mientras no exista la subida de imágenes (ver coverPresetOf).
  coverPath: string | null
  // FALTA EN LA BASE: la etiqueta de una nota ("Auralun", "Ideas", "Trabajo").
  tag: string | null
  position: number
  characterIds: string[]
  // Momento de la última vez que se tocó (UTC), para "ayer", "lun 5" y para "Seguir escribiendo".
  updatedAt: string
}

// Lo que se muestra de un capítulo o una página en las listas, ya armado.
export type PageRow = {
  id: string
  // El número o la letra del capítulo ("0", "I", "?") o el lugar en el cuaderno.
  label: string
  title: string
  wordsText: string
  chipText: string
  chipTone: 'ink' | 'warm' | 'muted' | 'soft' | 'accent'
}

export type BookView = {
  id: string
  title: string
  kind: StoryKind
  color: StoryColor
  initial: string
  kicker: string
  subText: string
  wordsText: string
  // 0..1; null si el libro no tiene meta.
  progress: number | null
  summary: string
  listTitle: string
  rows: PageRow[]
  // La página a la que lleva "Seguir escribiendo" (la última que se tocó); null si no hay ninguna.
  continueId: string | null
  characters: CharacterChip[]
}

export type CharacterChip = { id: string; name: string; shortName: string; initial: string; tone: OptionTone; kingdomLabel: string }

// Una nota en la pestaña Notas.
export type NoteCard = {
  id: string
  title: string
  excerpt: string
  checklist: { text: string; done: boolean }[]
  tag: string
  tagTone: OptionTone
  cover: 'map' | 'mood' | 'photo' | null
  imageCount: number
  whenText: string
}

// --- Mundos -------------------------------------------------------------------------------------

// FALTA EN LA BASE (todo lo de aquí abajo, hasta Personajes): la base solo tiene `worlds` con nombre,
// descripción y portada. Las eras, regiones, especies, reglas y el "lore" son cosas que pide el canvas.
export type WorldEvent = { id: string; title: string; description: string }

export type WorldEra = {
  id: string
  // "I", "II"… en números romanos, como los pinta el canvas.
  number: string
  name: string
  shortName: string
  summary: string
  // Tu nota de la era ("corregir cuando haya ideas claras").
  note: string
  events: WorldEvent[]
}

export type WorldRegion = {
  id: string
  name: string
  tagline: string
  description: string
  // Los reinos de una región se muestran como botones que abren sus personajes.
  kingdoms: string[]
  peoples: string[]
  // Una región oscura (Nocturnia) y si ya tiene su propia página escrita.
  dark: boolean
  hasPage: boolean
}

// Un escrito de "lore" que cuelga de una era (y, si aplica, de una región) en la matriz del Resumen.
export type WorldLore = { id: string; title: string; eraId: string; regionId: string | null }

// Una idea por escribir: una historia que todavía no existe.
export type WorldIdea = { id: string; title: string; summary: string; eraId: string; regionId: string | null }

export type WorldSpecies = { id: string; name: string; regionId: string; description: string }

export type WorldRule = { id: string; title: string; text: string }

export type World = {
  id: string
  name: string
  description: string
  coverPath: string | null
  eras: WorldEra[]
  regions: WorldRegion[]
  lore: WorldLore[]
  ideas: WorldIdea[]
  species: WorldSpecies[]
  rules: WorldRule[]
  // Si ya subió su mapa (todavía no se pueden subir archivos: ver la nota de sesión).
  hasMap: boolean
}

// --- Personajes ---------------------------------------------------------------------------------

export type CharacterFieldType = FieldType

export type FieldOption = { id: string; label: string; tone: OptionTone }

// `character_fields` de data-model.md: las columnas de la base de personajes. Reino, Rol y Era vienen de fábrica.
export type CharacterField = {
  id: string
  worldId: string
  name: string
  type: CharacterFieldType
  options: FieldOption[]
  // Reino, Rol y Era vienen de fábrica y no se quitan. FALTA EN LA BASE: marcar así las columnas de fábrica.
  builtIn: boolean
}

export type CharacterValue = string | number | null

export type Character = {
  id: string
  worldId: string
  name: string
  imagePath: string | null
  // El valor de cada columna, por id de columna (`characters.fields`, jsonb).
  values: Record<string, CharacterValue>
  // FALTA EN LA BASE: la ficha escrita del personaje (su página).
  description: string
  storyIds: string[]
  // La página donde se escribe su ficha completa; se crea la primera vez que se abre.
  pageId: string | null
}

// --- El editor de una página --------------------------------------------------------------------

export type Crumb = { label: string; href: string | null }

// Todo lo que necesita la pantalla de una página (Pagina.dc.html): lo que se edita, la ruta de migas y lo que
// se enseña de su historia y de sus personajes.
export type PageEditorView = {
  id: string
  kind: PageKind
  title: string
  status: PageStatus
  tag: string | null
  content: TiptapDoc
  wordCount: number
  crumbs: Crumb[]
  story: { id: string; title: string; wordGoal: number | null } | null
  characters: CharacterChip[]
  // A dónde se vuelve al borrar la página.
  backHref: string
  // "Guardado hace 3 h": lo último que se ve de la página al abrirla.
  savedText: string
}

// --- La página de un mundo ------------------------------------------------------------------------

export type WorldHeaderView = {
  id: string
  name: string
  description: string
  stats: { value: number; label: string }[]
}

// La matriz "Dónde y cuándo" del Resumen: cada región (y "todo el mundo") en cada era.
export type MatrixItem = { id: string; label: string; kind: 'story' | 'lore' | 'idea'; href: string }
export type MatrixRow = { id: string; name: string; sub: string; cells: { eraId: string; items: MatrixItem[] }[] }
export type MatrixEra = { id: string; number: string; shortName: string; href: string }

export type WorldGap = { id: string; title: string; detail: string }

export type WorldSummaryView = {
  worldId: string
  worldName: string
  eras: MatrixEra[]
  rows: MatrixRow[]
  gaps: WorldGap[]
  rules: WorldRule[]
}

export type TimelineView = {
  worldId: string
  eras: WorldEra[]
  // La era que se abre al entrar (la de la dirección, o la primera).
  initialEraId: string | null
}

export type RegionCard = WorldRegion & {
  // Cada reino con cuántos personajes tiene y a qué filtro de personajes lleva.
  kingdomLinks: { name: string; countText: string; href: string }[]
}

export type RegionsView = { worldId: string; regions: RegionCard[]; hasMap: boolean }

export type WorldStoryPanel = {
  id: string
  title: string
  initial: string
  color: StoryColor
  eraLabel: string | null
  regionName: string | null
  summary: string
  chapters: PageRow[]
  leads: CharacterChip[]
  resources: StoryResource[]
}

export type StoriesTabView = { worldId: string; stories: WorldStoryPanel[]; ideas: (WorldIdea & { eraLabel: string; regionName: string | null })[] }

export type WorldCharacter = CharacterChip & {
  groupId: string
  placeText: string
  tags: string[]
  metaText: string
  description: string
}

export type CharactersTabView = {
  worldId: string
  groupLabel: string
  groups: { id: string; label: string; count: number }[]
  characters: WorldCharacter[]
  initialGroup: string
  initialCharacterId: string | null
}

export type SpeciesView = { worldId: string; species: (WorldSpecies & { regionName: string; dark: boolean })[] }

// --- La base de datos de personajes -------------------------------------------------------------

export type CharacterRow = {
  id: string
  name: string
  initial: string
  tone: OptionTone
  // El id de la opción de la columna de grupo (Reino) a la que pertenece; '' si no tiene.
  groupId: string
  values: Record<string, CharacterValue>
  description: string
  // Los títulos de las historias en las que aparece.
  stories: string[]
  pageId: string | null
}

export type CharacterDbView = {
  worlds: { id: string; name: string }[]
  worldId: string
  worldName: string
  fields: CharacterField[]
  // La columna por la que se filtra y se arma el tablero (Reino); null si el mundo no tiene ninguna de selección.
  groupFieldId: string | null
  rows: CharacterRow[]
  // El personaje que se abre al entrar (`?abrir=` en la dirección), o null.
  initialOpenId: string | null
}

// La tarjeta de un mundo en la pestaña Mundos.
export type WorldCard = { id: string; name: string; countsText: string }

// --- Resúmenes ----------------------------------------------------------------------------------

// Una persona escribe cada día: las palabras de cada día de la semana (lunes a domingo).
export type WeekDay = { date: IsoDate; label: string; words: number; isToday: boolean; isFuture: boolean }

export type WritingsOverview = {
  worldCount: number
  // Historias y cuadernos juntos (lo que cuenta la pestaña Historias) y solo las historias (el resumen).
  bookCount: number
  storyCount: number
  noteCount: number
  characterCount: number
  weekTotal: number
  dailyGoal: number
  week: WeekDay[]
  // Para "Escribir": la última página que se tocó, o null si todavía no hay ninguna.
  lastPageId: string | null
}
