import { emptyDoc, tiptapTextBlocks, tiptapWordCount, walkTiptap, type OptionTone, type TiptapDoc } from '@kairo/shared'

import { addDays, dayOfMonth, diffDays, formatDayMonth, formatMonthShort, startOfWeek, todayIn, WEEKDAYS_SHORT, weekdayOf, type IsoDate } from '@/lib/dates'

import type { BookView, CharacterChip, CharacterRecord, NoteCard, PageRecord, PageRow, StoryRecord, WeekDay, WritingDay } from './types'
import { PAGE_STATUS_LABEL } from './types'

// La lógica de Escritos que no es de pantalla ni de servidor: separar el número del título de un capítulo, contar
// lo que hay en una página, armar los libros y las notas, repartir las palabras de la semana. Todo son funciones
// puras, así se prueban sin abrir nada.

// "1,253 palabras", "1 palabra".
export const formatCount = (value: number) => new Intl.NumberFormat('es-MX').format(value)
export const plural = (value: number, one: string, many: string) => `${formatCount(value)} ${value === 1 ? one : many}`

// --- Títulos ------------------------------------------------------------------------------------

// "0.- Antecedentes de Vadronia" → número "0" y nombre "Antecedentes de Vadronia". Un título sin número
// ("Una noche de constelaciones") lleva un "?" en el lugar del número, como en el canvas.
export function splitTitle(title: string): { label: string; name: string } {
  const match = /^([0-9]+|[IVXLCDM]+)\.-\s?(.*)$/.exec(title.trim())
  if (!match) return { label: '?', name: title.trim() || 'Sin título' }
  return { label: match[1], name: match[2].trim() || 'Sin título' }
}

const HONORIFICS = /^(Rey|Reina|Príncipe|Principe|Princesa) /

// "Príncipe Kain" → "Kain": la inicial del círculo no es la "P" de Príncipe.
export const initialOf = (name: string) => name.replace(HONORIFICS, '').trim().charAt(0).toUpperCase() || '?'

// El nombre corto con el que se ve un personaje en chips y tarjetas: "Jericó Lucienne Bonaventure" → "Jericó".
// Un título ("Rey Heinar") o un nombre de dos palabras se queda como está.
export function shortNameOf(name: string): string {
  const words = name.trim().split(/\s+/)
  return words.length > 2 && !name.includes('/') ? words[0] : name.trim()
}

// --- Contenido de una página --------------------------------------------------------------------

export type PageSummary = {
  words: number
  images: number
  tasks: number
  tasksDone: number
  excerpt: string
  checklist: { text: string; done: boolean }[]
}

// Qué hay en una página: cuántas palabras, imágenes y casillas, el primer párrafo con texto y las casillas
// (para la tarjeta de una nota). Las imágenes de una galería cuentan una por una.
export function summarize(doc: TiptapDoc): PageSummary {
  let images = 0
  let tasks = 0
  let tasksDone = 0
  const checklist: { text: string; done: boolean }[] = []

  walkTiptap(doc.content, (node) => {
    if (node.type === 'image') images += 1
    if (node.type === 'taskItem') {
      tasks += 1
      const done = node.attrs?.checked === true
      if (done) tasksDone += 1
      // El texto de la casilla son los párrafos de adentro.
      const text = tiptapTextBlocks({ type: 'doc', content: node.content ?? [] }).join(' ').trim()
      checklist.push({ text, done })
    }
  })

  const excerpt = tiptapTextBlocks(doc).find((block) => block.trim().length > 0)?.trim() ?? ''
  return { words: tiptapWordCount(doc), images, tasks, tasksDone, excerpt, checklist }
}

export type PageShape = 'list' | 'gallery' | 'open'

// La forma de una página suelta de un cuaderno: con casillas es una lista, con imágenes y sin texto una galería.
export function shapeOf(summary: PageSummary): PageShape {
  if (summary.tasks > 0) return 'list'
  if (summary.images > 0 && summary.words === 0) return 'gallery'
  return 'open'
}

const SHAPE_LABEL: Record<PageShape, string> = { list: 'Lista', gallery: 'Galería', open: 'Abierta' }
const SHAPE_TONE: Record<PageShape, PageRow['chipTone']> = { list: 'soft', gallery: 'accent', open: 'muted' }

// --- Portadas -----------------------------------------------------------------------------------

export type CoverPreset = 'map' | 'mood' | 'photo'

// Igual que Proyectos: la portada ilustrada de una nota rápida es "preset:<clave>".
export function coverPresetOf(coverPath: string | null): CoverPreset | null {
  if (coverPath === 'preset:map' || coverPath === 'preset:mood' || coverPath === 'preset:photo') return coverPath.slice(7) as CoverPreset
  return null
}

// --- Etiquetas de las notas ---------------------------------------------------------------------

// La etiqueta de una nota es texto libre (`pages.tag`): estas tres tienen su color, las demás se pintan neutras.
const TAG_TONES: Record<string, OptionTone> = { Aurelun: 'ink', Ideas: 'warm', Trabajo: 'soft' }
export const NO_TAG_LABEL = 'Sin etiqueta'
export const tagToneOf = (tag: string | null): OptionTone => (tag ? (TAG_TONES[tag] ?? 'muted') : 'muted')

// --- Fechas -------------------------------------------------------------------------------------

// Cuándo se tocó una nota, como en el canvas: "ahora", "hoy", "ayer", "lun 5" (dentro de la semana) y "30 sep".
export function formatNoteWhen(updatedAt: string, timeZone: string, now: Date = new Date()): string {
  if (now.getTime() - new Date(updatedAt).getTime() < 3 * 60_000) return 'ahora'
  const today = todayIn(timeZone, now)
  const day = todayIn(timeZone, new Date(updatedAt))
  const diff = diffDays(day, today)
  if (diff <= 0) return 'hoy'
  if (diff === 1) return 'ayer'
  if (diff < 7) return `${WEEKDAYS_SHORT[weekdayOf(day)].toLowerCase()} ${dayOfMonth(day)}`
  return `${dayOfMonth(day)} ${formatMonthShort(day)}`
}

// "Guardado hace un momento", "Guardado hace 5 min", "Guardado hace 3 h", "Guardado ayer", "Guardado el 3 de octubre".
export function savedTextOf(updatedAt: string, timeZone: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(updatedAt).getTime()) / 60_000)
  if (minutes < 1) return 'Guardado hace un momento'
  if (minutes < 60) return `Guardado hace ${minutes} min`
  if (minutes < 24 * 60) return `Guardado hace ${Math.floor(minutes / 60)} h`
  const day = todayIn(timeZone, new Date(updatedAt))
  return diffDays(day, todayIn(timeZone, now)) === 1 ? 'Guardado ayer' : `Guardado el ${formatDayMonth(day)}`
}

// --- Libros y notas -----------------------------------------------------------------------------

const byUpdatedDesc = (a: PageRecord, b: PageRecord) => b.updatedAt.localeCompare(a.updatedAt)

const STATUS_TONE: Record<PageRecord['status'], PageRow['chipTone']> = {
  in_progress: 'ink',
  pending: 'warm',
  none: 'muted',
  done: 'accent',
}

// Las páginas de una historia en su orden.
export const pagesOfStory = (story: StoryRecord, pages: PageRecord[]) => pages.filter((page) => page.storyId === story.id).sort((a, b) => a.position - b.position)

// Las filas de un libro: los capítulos de una historia (con su estado) o las páginas de un cuaderno (con su forma).
export function rowsOf(story: StoryRecord, pages: PageRecord[]): PageRow[] {
  return pagesOfStory(story, pages).map((page, index) => {
    const { label, name } = splitTitle(page.title)
    if (story.kind === 'story') {
      return {
        id: page.id,
        label,
        title: name,
        wordsText: page.wordCount > 0 ? plural(page.wordCount, 'palabra', 'palabras') : '—',
        chipText: PAGE_STATUS_LABEL[page.status],
        chipTone: STATUS_TONE[page.status],
      }
    }
    const summary = summarize(page.content ?? emptyDoc())
    const shape = shapeOf(summary)
    return {
      id: page.id,
      label: String(index + 1),
      title: page.title.trim() || 'Sin título',
      wordsText:
        shape === 'list' ? plural(summary.tasks, 'casilla', 'casillas') : shape === 'gallery' ? plural(summary.images, 'imagen', 'imágenes') : plural(summary.words, 'palabra', 'palabras'),
      chipText: SHAPE_LABEL[shape],
      chipTone: SHAPE_TONE[shape],
    }
  })
}

export function storyWords(story: StoryRecord, pages: PageRecord[]): number {
  return pages.filter((page) => page.storyId === story.id).reduce((sum, page) => sum + page.wordCount, 0)
}

// El estado de un capítulo como chip (también lo usa la pestaña Historias de un mundo).
export const chapterStatusTone = (status: PageRecord['status']) => STATUS_TONE[status]

// El libro que se ve a la derecha de la lista (EscritosInicio): su resumen, sus capítulos o páginas y los
// personajes que aparecen en él. `context` es lo que se lee de su mundo (nombre y era), si tiene.
export function bookViewOf(story: StoryRecord, pages: PageRecord[], context: { worldName: string | null; eraLabel: string | null }, characters: CharacterChip[]): BookView {
  const rows = rowsOf(story, pages)
  const words = storyWords(story, pages)
  const kicker = story.kind === 'story' ? ['Historia', context.worldName, context.eraLabel].filter(Boolean).join(' · ') : 'Cuaderno'
  const noun = story.kind === 'story' ? ['capítulo', 'capítulos'] : ['página', 'páginas']
  return {
    id: story.id,
    title: story.title,
    kind: story.kind,
    color: story.color,
    initial: story.title.trim().charAt(0).toUpperCase() || '?',
    kicker,
    subText: `${story.kind === 'story' ? 'Historia' : 'Cuaderno'} · ${plural(rows.length, noun[0], noun[1])}`,
    wordsText: story.wordGoal ? `${formatCount(words)} de ${formatCount(story.wordGoal)} palabras` : plural(words, 'palabra', 'palabras'),
    progress: story.wordGoal ? Math.min(1, words / story.wordGoal) : null,
    summary: story.summary,
    listTitle: story.kind === 'story' ? 'Capítulos' : 'Páginas recientes',
    rows,
    continueId: pages.filter((page) => page.storyId === story.id).sort(byUpdatedDesc)[0]?.id ?? null,
    characters,
  }
}

// Las notas, de la más nueva a la más vieja.
export function noteCardsOf(pages: PageRecord[], timeZone: string, now: Date = new Date()): NoteCard[] {
  return pages
    .filter((page) => page.kind === 'note')
    .sort(byUpdatedDesc)
    .map((page) => {
      const summary = summarize(page.content ?? emptyDoc())
      return {
        id: page.id,
        title: page.title.trim() || 'Sin título',
        excerpt: summary.tasks > 0 ? '' : summary.excerpt,
        checklist: summary.checklist.slice(0, 4),
        tag: page.tag ?? NO_TAG_LABEL,
        tagTone: tagToneOf(page.tag),
        cover: coverPresetOf(page.coverPath),
        imageCount: summary.images,
        whenText: formatNoteWhen(page.updatedAt, timeZone, now),
      }
    })
}

// --- Personajes ---------------------------------------------------------------------------------

// Un personaje como chip (círculo con inicial o foto, nombre corto y su reino). El reino y su color los decide el
// mundo (world-utils.ts, kingdomOf): aquí ya llegan resueltos.
export function characterChip(character: CharacterRecord, kingdom: { label: string; tone: OptionTone }): CharacterChip {
  return {
    id: character.id,
    worldId: character.worldId,
    name: character.name,
    shortName: shortNameOf(character.name),
    initial: initialOf(character.name),
    tone: kingdom.tone,
    kingdomLabel: kingdom.label,
    imageUrl: character.imageUrl,
  }
}

// --- Palabras de la semana ----------------------------------------------------------------------

// Lunes a domingo de la semana de `today`, con las palabras de cada día. Los días que aún no llegan se marcan
// para no pintarlos como "no escribiste".
export function weekOf(days: WritingDay[], today: IsoDate): WeekDay[] {
  const byDay = new Map(days.map((item) => [item.day, item.words]))
  const monday = startOfWeek(today, 'monday')
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index)
    return {
      date,
      label: WEEKDAYS_SHORT[weekdayOf(date)].charAt(0),
      words: byDay.get(date) ?? 0,
      isToday: date === today,
      isFuture: diffDays(today, date) > 0,
    }
  })
}
