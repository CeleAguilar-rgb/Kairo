import { Inject, Injectable } from '@nestjs/common'
import type { PageKind, PageStatus, StoryArcInput, StoryColor, StoryKind, StoryResourceInput, StoryStatus, TiptapDoc } from '@kairo/shared'
import { and, asc, eq, getTableColumns, gte, isNull, max, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { pages, stories, writingDays } from '../../db/schema/writings'

export type StoryRow = typeof stories.$inferSelect
export type PageRow = typeof pages.$inferSelect

export type NewStory = { worldId: string | null; title: string; kind: StoryKind; summary: string; color: StoryColor; wordGoal: number | null; status: StoryStatus }

export type StoryPatch = Partial<{
  title: string
  summary: string
  color: StoryColor
  wordGoal: number | null
  status: StoryStatus
  eraId: string | null
  placeId: string | null
  arcs: StoryArcInput[]
  cast: string[]
  resources: StoryResourceInput[]
}>

export type PagePatch = Partial<{
  title: string
  status: PageStatus
  tag: string | null
  content: TiptapDoc
  wordCount: number
  arcId: string | null
  eraId: string | null
  povCharacterId: string | null
}>

// Las listas de páginas no llevan el contenido de los capítulos (pueden ser largos y ninguna lista lo usa), pero sí
// el de las notas rápidas y las páginas de cuaderno: sus tarjetas y filas enseñan un pedazo del texto, sus casillas
// o cuántas imágenes tienen (EscritosInicio).
const { content: pageContent, ...pageListColumns } = getTableColumns(pages)
const noteContentOnly = sql<TiptapDoc | null>`case when ${pages.kind} in ('note', 'page') then ${pageContent} else null end`

// Historias, sus páginas y las palabras escritas por día. Siempre con `userId` en el `where`.
@Injectable()
export class StoriesRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // --- Historias -------------------------------------------------------------------------------------------

  findStories(userId: string, worldId?: string) {
    return this.db
      .select()
      .from(stories)
      .where(and(eq(stories.userId, userId), isNull(stories.deletedAt), worldId ? eq(stories.worldId, worldId) : undefined))
      .orderBy(asc(stories.createdAt))
  }

  findStory(userId: string, id: string) {
    return this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, id), eq(stories.userId, userId), isNull(stories.deletedAt)))
      .then((rows) => rows[0])
  }

  createStory(userId: string, story: NewStory) {
    return this.db
      .insert(stories)
      .values({ userId, ...story })
      .returning()
      .then((rows) => {
        if (!rows[0]) throw new Error('No se pudo crear la historia.')
        return rows[0]
      })
  }

  updateStory(userId: string, id: string, patch: StoryPatch) {
    return this.db
      .update(stories)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(stories.id, id), eq(stories.userId, userId), isNull(stories.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  // Una historia se va con sus capítulos o páginas (misma marca de tiempo).
  softDeleteStory(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const at = new Date()
      const [story] = await tx
        .update(stories)
        .set({ deletedAt: at })
        .where(and(eq(stories.id, id), eq(stories.userId, userId), isNull(stories.deletedAt)))
        .returning()
      if (!story) return undefined
      await tx.update(pages).set({ deletedAt: at }).where(and(eq(pages.userId, userId), eq(pages.storyId, id), isNull(pages.deletedAt)))
      return story
    })
  }

  restoreStory(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(stories).where(and(eq(stories.id, id), eq(stories.userId, userId)))
      if (!current?.deletedAt) return undefined
      const [story] = await tx.update(stories).set({ deletedAt: null }).where(and(eq(stories.id, id), eq(stories.userId, userId))).returning()
      await tx.update(pages).set({ deletedAt: null }).where(and(eq(pages.userId, userId), eq(pages.storyId, id), eq(pages.deletedAt, current.deletedAt)))
      return story
    })
  }

  // --- Páginas -----------------------------------------------------------------------------------------

  findPages(userId: string) {
    return this.db
      .select({ ...pageListColumns, content: noteContentOnly })
      .from(pages)
      .where(and(eq(pages.userId, userId), isNull(pages.deletedAt)))
      .orderBy(asc(pages.position), asc(pages.createdAt))
  }

  findPage(userId: string, id: string) {
    return this.db
      .select()
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.userId, userId), isNull(pages.deletedAt)))
      .then((rows) => rows[0])
  }

  // Al final de su historia (las notas rápidas no tienen orden propio: se ven de la más nueva a la más vieja).
  async createPage(userId: string, page: { storyId: string | null; kind: PageKind; title: string; content: TiptapDoc }) {
    const [last] = page.storyId
      ? await this.db
          .select({ value: max(pages.position) })
          .from(pages)
          .where(and(eq(pages.userId, userId), eq(pages.storyId, page.storyId)))
      : [{ value: -1 }]
    const [row] = await this.db
      .insert(pages)
      .values({ userId, ...page, position: (last?.value ?? -1) + 1 })
      .returning()
    if (!row) throw new Error('No se pudo crear la página.')
    return row
  }

  updatePage(userId: string, id: string, patch: PagePatch) {
    return this.db
      .update(pages)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(pages.id, id), eq(pages.userId, userId), isNull(pages.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  softDeletePage(userId: string, id: string) {
    return this.db
      .update(pages)
      .set({ deletedAt: new Date() })
      .where(and(eq(pages.id, id), eq(pages.userId, userId), isNull(pages.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  // Una página solo vuelve si su historia sigue viva.
  async restorePage(userId: string, id: string) {
    const [current] = await this.db.select().from(pages).where(and(eq(pages.id, id), eq(pages.userId, userId)))
    if (!current?.deletedAt) return undefined
    if (current.storyId && !(await this.findStory(userId, current.storyId))) return undefined
    return this.db
      .update(pages)
      .set({ deletedAt: null })
      .where(and(eq(pages.id, id), eq(pages.userId, userId)))
      .returning()
      .then((rows) => rows[0])
  }

  // --- Palabras por día ------------------------------------------------------------------------------------

  findWritingDays(userId: string, from: string) {
    return this.db
      .select({ day: writingDays.dayOn, words: writingDays.words })
      .from(writingDays)
      .where(and(eq(writingDays.userId, userId), gte(writingDays.dayOn, from), isNull(writingDays.deletedAt)))
      .orderBy(asc(writingDays.dayOn))
  }

  // Suma palabras al día: crea la fila la primera vez y después solo suma (un solo viaje a la base, sin carrera
  // entre dos pestañas que guardan a la vez).
  async addWords(userId: string, day: string, words: number) {
    if (words <= 0) return
    await this.db
      .insert(writingDays)
      .values({ userId, dayOn: day, words })
      .onConflictDoUpdate({ target: [writingDays.userId, writingDays.dayOn], set: { words: sql`${writingDays.words} + ${words}`, updatedAt: new Date() } })
  }
}
