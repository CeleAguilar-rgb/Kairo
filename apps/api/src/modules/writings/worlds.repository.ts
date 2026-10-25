import { Inject, Injectable } from '@nestjs/common'
import type { OptionTone, TemplateFieldInput, WorldRuleInput } from '@kairo/shared'
import { and, asc, eq, inArray, isNull, max } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { characters, noteTemplates, pages, stories, worldEras, worldEvents, worldNotes, worlds } from '../../db/schema/writings'

export type WorldRow = typeof worlds.$inferSelect
export type TemplateRow = typeof noteTemplates.$inferSelect

export type WorldPatch = Partial<{
  name: string
  description: string
  synopsis: string
  rules: WorldRuleInput[]
  tabs: string[]
  stats: string[]
}>

export type TemplatePatch = Partial<{ name: string; color: OptionTone; fields: TemplateFieldInput[] }>

export type NewTemplate = { key: TemplateRow['key']; name: string; color: OptionTone; fields: TemplateFieldInput[]; position: number }

// Mundos y sus plantillas. Como todo repository: cada función recibe el `userId` y lo pone en el `where`, también
// al editar y borrar (security.md #4). Solo toca tablas de Escritos (modules.md).
@Injectable()
export class WorldsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // --- Mundos -----------------------------------------------------------------------------------------

  findWorlds(userId: string) {
    return this.db
      .select()
      .from(worlds)
      .where(and(eq(worlds.userId, userId), isNull(worlds.deletedAt)))
      .orderBy(asc(worlds.createdAt))
  }

  findWorld(userId: string, id: string) {
    return this.db
      .select()
      .from(worlds)
      .where(and(eq(worlds.id, id), eq(worlds.userId, userId), isNull(worlds.deletedAt)))
      .then((rows) => rows[0])
  }

  // El mundo y sus plantillas de fábrica en una sola transacción: un mundo nunca existe sin ellas.
  createWorld(userId: string, fields: { name: string; description: string }, templates: NewTemplate[]) {
    return this.db.transaction(async (tx) => {
      const [world] = await tx.insert(worlds).values({ userId, ...fields }).returning()
      if (!world) throw new Error('No se pudo crear el mundo.')
      if (templates.length > 0) await tx.insert(noteTemplates).values(templates.map((template) => ({ userId, worldId: world.id, ...template })))
      return world
    })
  }

  updateWorld(userId: string, id: string, patch: WorldPatch) {
    return this.db
      .update(worlds)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(worlds.id, id), eq(worlds.userId, userId), isNull(worlds.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  setWorldMap(userId: string, id: string, mapPath: string | null) {
    return this.db
      .update(worlds)
      .set({ mapPath, updatedAt: new Date() })
      .where(and(eq(worlds.id, id), eq(worlds.userId, userId), isNull(worlds.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  // Borrar un mundo se lleva todo lo suyo a la papelera con LA MISMA marca de tiempo: así "Deshacer" devuelve
  // exactamente lo que se fue junto (y no lo que ya estaba en la papelera desde antes).
  softDeleteWorld(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const at = new Date()
      const [world] = await tx
        .update(worlds)
        .set({ deletedAt: at })
        .where(and(eq(worlds.id, id), eq(worlds.userId, userId), isNull(worlds.deletedAt)))
        .returning()
      if (!world) return undefined
      await tx.update(noteTemplates).set({ deletedAt: at }).where(and(eq(noteTemplates.userId, userId), eq(noteTemplates.worldId, id), isNull(noteTemplates.deletedAt)))
      await tx.update(characters).set({ deletedAt: at }).where(and(eq(characters.userId, userId), eq(characters.worldId, id), isNull(characters.deletedAt)))
      await tx.update(worldNotes).set({ deletedAt: at }).where(and(eq(worldNotes.userId, userId), eq(worldNotes.worldId, id), isNull(worldNotes.deletedAt)))
      const eraIds = (await tx.select({ id: worldEras.id }).from(worldEras).where(and(eq(worldEras.userId, userId), eq(worldEras.worldId, id), isNull(worldEras.deletedAt)))).map((row) => row.id)
      await tx.update(worldEras).set({ deletedAt: at }).where(and(eq(worldEras.userId, userId), eq(worldEras.worldId, id), isNull(worldEras.deletedAt)))
      if (eraIds.length) await tx.update(worldEvents).set({ deletedAt: at }).where(and(eq(worldEvents.userId, userId), inArray(worldEvents.eraId, eraIds), isNull(worldEvents.deletedAt)))
      const storyIds = (await tx.select({ id: stories.id }).from(stories).where(and(eq(stories.userId, userId), eq(stories.worldId, id), isNull(stories.deletedAt)))).map((row) => row.id)
      await tx.update(stories).set({ deletedAt: at }).where(and(eq(stories.userId, userId), eq(stories.worldId, id), isNull(stories.deletedAt)))
      if (storyIds.length) await tx.update(pages).set({ deletedAt: at }).where(and(eq(pages.userId, userId), inArray(pages.storyId, storyIds), isNull(pages.deletedAt)))
      return world
    })
  }

  // Lo contrario: el mundo y lo que se fue con él (misma marca de tiempo).
  restoreWorld(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(worlds).where(and(eq(worlds.id, id), eq(worlds.userId, userId)))
      if (!current?.deletedAt) return undefined
      const at = current.deletedAt
      const [world] = await tx.update(worlds).set({ deletedAt: null }).where(and(eq(worlds.id, id), eq(worlds.userId, userId))).returning()
      await tx.update(noteTemplates).set({ deletedAt: null }).where(and(eq(noteTemplates.userId, userId), eq(noteTemplates.worldId, id), eq(noteTemplates.deletedAt, at)))
      await tx.update(characters).set({ deletedAt: null }).where(and(eq(characters.userId, userId), eq(characters.worldId, id), eq(characters.deletedAt, at)))
      await tx.update(worldNotes).set({ deletedAt: null }).where(and(eq(worldNotes.userId, userId), eq(worldNotes.worldId, id), eq(worldNotes.deletedAt, at)))
      const eraIds = (await tx.select({ id: worldEras.id }).from(worldEras).where(and(eq(worldEras.userId, userId), eq(worldEras.worldId, id), eq(worldEras.deletedAt, at)))).map((row) => row.id)
      await tx.update(worldEras).set({ deletedAt: null }).where(and(eq(worldEras.userId, userId), eq(worldEras.worldId, id), eq(worldEras.deletedAt, at)))
      if (eraIds.length) await tx.update(worldEvents).set({ deletedAt: null }).where(and(eq(worldEvents.userId, userId), inArray(worldEvents.eraId, eraIds), eq(worldEvents.deletedAt, at)))
      const storyIds = (await tx.select({ id: stories.id }).from(stories).where(and(eq(stories.userId, userId), eq(stories.worldId, id), eq(stories.deletedAt, at)))).map((row) => row.id)
      await tx.update(stories).set({ deletedAt: null }).where(and(eq(stories.userId, userId), eq(stories.worldId, id), eq(stories.deletedAt, at)))
      if (storyIds.length) await tx.update(pages).set({ deletedAt: null }).where(and(eq(pages.userId, userId), inArray(pages.storyId, storyIds), eq(pages.deletedAt, at)))
      return world
    })
  }

  // --- Plantillas ----------------------------------------------------------------------------------------

  // Las de todos los mundos (la biblioteca) o las de uno.
  findTemplates(userId: string, worldId?: string) {
    return this.db
      .select()
      .from(noteTemplates)
      .where(and(eq(noteTemplates.userId, userId), isNull(noteTemplates.deletedAt), worldId ? eq(noteTemplates.worldId, worldId) : undefined))
      .orderBy(asc(noteTemplates.position), asc(noteTemplates.createdAt))
  }

  findTemplate(userId: string, id: string) {
    return this.db
      .select()
      .from(noteTemplates)
      .where(and(eq(noteTemplates.id, id), eq(noteTemplates.userId, userId), isNull(noteTemplates.deletedAt)))
      .then((rows) => rows[0])
  }

  async createTemplate(userId: string, worldId: string, template: Omit<NewTemplate, 'position'>) {
    const [last] = await this.db
      .select({ value: max(noteTemplates.position) })
      .from(noteTemplates)
      .where(and(eq(noteTemplates.userId, userId), eq(noteTemplates.worldId, worldId)))
    const [row] = await this.db
      .insert(noteTemplates)
      .values({ userId, worldId, ...template, position: (last?.value ?? -1) + 1 })
      .returning()
    if (!row) throw new Error('No se pudo crear la sección.')
    return row
  }

  updateTemplate(userId: string, id: string, patch: TemplatePatch) {
    return this.db
      .update(noteTemplates)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(noteTemplates.id, id), eq(noteTemplates.userId, userId), isNull(noteTemplates.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  // Una sección extra se va a la papelera con sus notas (misma marca de tiempo, igual que un mundo).
  softDeleteTemplate(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const at = new Date()
      const [template] = await tx
        .update(noteTemplates)
        .set({ deletedAt: at })
        .where(and(eq(noteTemplates.id, id), eq(noteTemplates.userId, userId), isNull(noteTemplates.deletedAt)))
        .returning()
      if (!template) return undefined
      await tx.update(worldNotes).set({ deletedAt: at }).where(and(eq(worldNotes.userId, userId), eq(worldNotes.templateId, id), isNull(worldNotes.deletedAt)))
      return template
    })
  }

  restoreTemplate(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(noteTemplates).where(and(eq(noteTemplates.id, id), eq(noteTemplates.userId, userId)))
      if (!current?.deletedAt) return undefined
      const [template] = await tx.update(noteTemplates).set({ deletedAt: null }).where(and(eq(noteTemplates.id, id), eq(noteTemplates.userId, userId))).returning()
      await tx.update(worldNotes).set({ deletedAt: null }).where(and(eq(worldNotes.userId, userId), eq(worldNotes.templateId, id), eq(worldNotes.deletedAt, current.deletedAt)))
      return template
    })
  }
}
