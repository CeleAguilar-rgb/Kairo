import type {
  CoverColor,
  CoverMode,
  EntryExtraInput,
  FieldKind,
  FieldValue,
  NoteTemplateFieldType,
  NoteTemplateKey,
  OptionTone,
  PageKind,
  PageStatus,
  StoryColor,
  StoryKind,
  StoryStatus,
  TemplateFieldKey,
  TiptapDoc,
} from '@kairo/shared'

import type { IsoDate } from '@/lib/dates'

// Los datos de Escritos como los devuelve la API (`GET /writings/library` y compañía, decisión #45). La API manda
// hechos crudos y el Next.js arma cada pestaña con ellos (decisión #38): las vistas de abajo salen de aquí con las
// funciones de writing-utils.ts y world-utils.ts.
export type { CoverColor, CoverMode, FieldKind, FieldValue, NoteTemplateFieldType, NoteTemplateKey, OptionTone, PageKind, PageStatus, StoryColor, StoryKind, StoryStatus }

export const STORY_KIND_LABEL: Record<StoryKind, string> = {
  story: 'Historia',
  notebook: 'Cuaderno',
}

export const STORY_STATUS_LABEL: Record<StoryStatus, string> = {
  idea: 'Idea',
  in_progress: 'En curso',
  done: 'Terminada',
}

export const PAGE_STATUS_LABEL: Record<PageStatus, string> = {
  none: 'Sin estado',
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Listo',
}

// --- Registros (lo que llega de la API) ---------------------------------------------------------------

export type WorldRule = { id: string; title: string; text: string }

export type WorldRecord = {
  id: string
  name: string
  description: string
  synopsis: string
  rules: WorldRule[]
  // Las pestañas de la barra y los contadores, en orden; null = los de fábrica.
  tabs: string[] | null
  stats: string[] | null
  mapUrl: string | null
  createdAt: string
  updatedAt: string
}

export type FieldOption = { id: string; label: string; tone: OptionTone }

// Un campo de una plantilla: "de vista corta" (kind 'field', sale arriba y en la tarjeta, con un `type`) o
// "para rellenar" (kind 'section', una sección con pregunta guía `hint`). `options` solo en los de selección.
export type TemplateField = {
  id: string
  kind: FieldKind
  // Los que la app lee por su cuenta: 'role' (Protagonistas…), 'home' (especies por región), 'place_type'.
  key: TemplateFieldKey | null
  name: string
  type: NoteTemplateFieldType
  hint: string
  options: FieldOption[]
}

// Personaje, Especie y Lugar vienen con el mundo (`key`); una plantilla sin `key` es una sección extra con pestaña.
export type NoteTemplate = {
  id: string
  worldId: string
  key: NoteTemplateKey | null
  name: string
  color: OptionTone
  fields: TemplateField[]
  position: number
}

export type CoverRecord = { mode: CoverMode; color: CoverColor | null; position: number; url: string | null }

export type EntryExtra = EntryExtraInput

// Lo común de una ficha de la wiki (personaje o nota). `values` va por id de campo.
type EntryBase = {
  id: string
  worldId: string
  name: string
  summary: string
  draft: boolean
  values: Record<string, FieldValue>
  extras: EntryExtra[]
  url: string | null
  position: number
  cover: CoverRecord
  createdAt: string
  updatedAt: string
  // Solo al pedir la ficha sola (su página completa); las listas no lo traen.
  content?: TiptapDoc | null
}

export type CharacterRecord = EntryBase & { sections: string[]; imageUrl: string | null }

export type NoteRecord = EntryBase & { templateId: string; parentId: string | null }

export type EraRecord = { id: string; worldId: string; name: string; shortName: string; summary: string; note: string; position: number }

export type EventRecord = {
  id: string
  eraId: string
  title: string
  description: string
  causes: string
  consequences: string
  notes: string[]
  who: string[]
  where: string[]
  position: number
}

export type StoryArc = { id: string; name: string }
export type StoryResource = { id: string; name: string; url: string }

export type StoryRecord = {
  id: string
  worldId: string | null
  title: string
  kind: StoryKind
  status: StoryStatus
  summary: string
  wordGoal: number | null
  color: StoryColor
  eraId: string | null
  placeId: string | null
  arcs: StoryArc[]
  cast: string[]
  resources: StoryResource[]
  createdAt: string
  updatedAt: string
}

// Una página: un capítulo, una nota rápida o una página de cuaderno. En las listas, `content` no viene en los
// capítulos (es null); en las notas y páginas de cuaderno sí, porque sus tarjetas enseñan un pedazo.
export type PageRecord = {
  id: string
  storyId: string | null
  parentId: string | null
  kind: PageKind
  title: string
  content: TiptapDoc | null
  status: PageStatus
  tag: string | null
  wordCount: number
  coverPath: string | null
  position: number
  arcId: string | null
  eraId: string | null
  povCharacterId: string | null
  createdAt: string
  updatedAt: string
}

export type Library = {
  worlds: WorldRecord[]
  templates: NoteTemplate[]
  characters: CharacterRecord[]
  notes: NoteRecord[]
  eras: EraRecord[]
  events: EventRecord[]
  stories: StoryRecord[]
  pages: PageRecord[]
}

export type WritingDay = { day: IsoDate; words: number }

// --- El mundo para la pantalla ---------------------------------------------------------------------------

// Todo lo de un mundo de un jalón, para el contexto del cliente (WorldShell): cada pestaña, el panel lateral y la
// página completa leen de aquí. Las eras y eventos ya vienen en orden.
export type WorldBundle = {
  world: WorldRecord
  templates: NoteTemplate[]
  characters: CharacterRecord[]
  notes: NoteRecord[]
  eras: EraRecord[]
  events: EventRecord[]
  stories: StoryRecord[]
  chapters: PageRecord[]
}

// Una ficha cualquiera: personaje o nota. `kind` dice de qué tabla viene.
export type Entry = ({ kind: 'character' } & CharacterRecord) | ({ kind: 'note' } & NoteRecord)

// --- Vistas de Inicio de Escritos ------------------------------------------------------------------------

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

export type CharacterChip = { id: string; worldId: string; name: string; shortName: string; initial: string; tone: OptionTone; kingdomLabel: string; imageUrl: string | null }

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

// La tarjeta de un mundo en la pestaña Mundos.
export type WorldCard = { id: string; name: string; countsText: string }

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

// --- El editor de una página ------------------------------------------------------------------------------

export type Crumb = { label: string; href: string | null }

// Los campos fijos de un capítulo (decisión #45): su arco, su era y su punto de vista, con las opciones de su
// historia y su mundo. null si la página no es un capítulo de una historia con mundo.
export type ChapterMetaView = {
  arcId: string | null
  eraId: string | null
  povCharacterId: string | null
  arcs: { id: string; name: string }[]
  eras: { id: string; name: string }[]
  characters: { id: string; name: string }[]
}

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
  chapter: ChapterMetaView | null
  // A dónde se vuelve al borrar la página.
  backHref: string
  // "Guardado hace 3 h": lo último que se ve de la página al abrirla.
  savedText: string
}

// --- La base de datos de personajes (BaseDatos.dc.html) ------------------------------------------------

export type CharacterRow = {
  id: string
  name: string
  initial: string
  tone: OptionTone
  imageUrl: string | null
  // El id de la opción de la columna de grupo (Reino) a la que pertenece; '' si no tiene.
  groupId: string
  values: Record<string, FieldValue>
  summary: string
  // Los títulos de las historias en las que aparece.
  stories: string[]
}

export type CharacterDbView = {
  worlds: { id: string; name: string }[]
  worldId: string
  worldName: string
  templateId: string
  // Las columnas: los campos "de vista corta" de la plantilla Personaje.
  fields: TemplateField[]
  // La plantilla completa (con sus secciones), para agregar o quitar una columna sin perder lo demás.
  allFields: TemplateField[]
  // La columna por la que se filtra y se arma el tablero (la primera de selección); null si no hay.
  groupFieldId: string | null
  rows: CharacterRow[]
  // Los nombres de lo que se puede vincular (para mostrar los vínculos y las eras como texto).
  names: Record<string, string>
  // Lo que se puede elegir en un campo de vínculo (personajes y notas del mundo) y en uno de era.
  linkOptions: { id: string; label: string }[]
  eraOptions: { id: string; label: string }[]
  // El personaje que se abre al entrar (`?abrir=` en la dirección), o null.
  initialOpenId: string | null
}
