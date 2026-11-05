import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { hit, ModuleSearch } from '../../common/search/module-search.js'
import { matches, PER_KIND, SearchRegistry } from '../../common/search/search.registry.js'
import { characters, noteTemplates, pages, stories, worldNotes, worlds } from '../../db/schema/writings.js'

// Ctrl+K en Escritos: mundos, personajes, notas del mundo, historias y páginas, por nombre o título. `parentId` es el
// mundo (para la ruta de una ficha o una historia); `detail` de una nota es su plantilla ("Lugar", "Especie").
@Injectable()
export class WritingsSearch extends ModuleSearch {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(SearchRegistry) registry: SearchRegistry,
  ) {
    super(registry)
  }

  async search(userId: string, pattern: string) {
    const db = this.db
    const [worldRows, characterRows, noteRows, storyRows, pageRows] = await Promise.all([
      db.select({ id: worlds.id, name: worlds.name }).from(worlds).where(and(eq(worlds.userId, userId), isNull(worlds.deletedAt), matches(worlds.name, pattern))).limit(PER_KIND),
      db
        .select({ id: characters.id, name: characters.name, worldId: characters.worldId, world: worlds.name })
        .from(characters)
        .innerJoin(worlds, eq(worlds.id, characters.worldId))
        .where(and(eq(characters.userId, userId), isNull(characters.deletedAt), isNull(worlds.deletedAt), matches(characters.name, pattern)))
        .limit(PER_KIND),
      db
        .select({ id: worldNotes.id, name: worldNotes.name, worldId: worldNotes.worldId, template: noteTemplates.name })
        .from(worldNotes)
        .innerJoin(noteTemplates, eq(noteTemplates.id, worldNotes.templateId))
        .where(and(eq(worldNotes.userId, userId), isNull(worldNotes.deletedAt), isNull(noteTemplates.deletedAt), matches(worldNotes.name, pattern)))
        .limit(PER_KIND),
      db
        .select({ id: stories.id, title: stories.title, worldId: stories.worldId })
        .from(stories)
        .where(and(eq(stories.userId, userId), isNull(stories.deletedAt), matches(stories.title, pattern)))
        .limit(PER_KIND),
      db
        .select({ id: pages.id, title: pages.title, kind: pages.kind })
        .from(pages)
        .where(and(eq(pages.userId, userId), isNull(pages.deletedAt), matches(pages.title, pattern)))
        .limit(PER_KIND),
    ])
    return [
      ...worldRows.map((row) => hit({ kind: 'world', id: row.id, title: row.name })),
      ...characterRows.map((row) => hit({ kind: 'character', id: row.id, title: row.name, detail: row.world, parentId: row.worldId })),
      ...noteRows.map((row) => hit({ kind: 'world_note', id: row.id, title: row.name, detail: row.template, parentId: row.worldId })),
      ...storyRows.map((row) => hit({ kind: 'story', id: row.id, title: row.title, parentId: row.worldId })),
      ...pageRows.map((row) => hit({ kind: 'page', id: row.id, title: row.title, detail: row.kind })),
    ]
  }
}
