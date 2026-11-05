import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import type { TrashKind } from '@kairo/shared'
import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { StorageService } from '../../common/storage/storage.service.js'
import { deletedAtOf, purgeRow } from '../../common/trash/trash-queries.js'
import { TrashRegistry } from '../../common/trash/trash.registry.js'
import type { TrashEntry, TrashSource } from '../../common/trash/trash.types.js'
import { characters, noteTemplates, pages, stories, worldEras, worldEvents, worldNotes, worlds } from '../../db/schema/writings.js'
import { EntriesRepository } from './entries.repository.js'
import { StoriesRepository } from './stories.repository.js'
import { TimelineRepository } from './timeline.repository.js'
import { WorldsRepository } from './worlds.repository.js'

const paths = (...values: (string | null)[]) => values.filter((value): value is string => value !== null)

// Papelera de Escritos (common/trash/trash.types.ts). Cada borrado de Escritos ya se lleva lo de adentro con la misma
// hora (un mundo con todo, una plantilla con sus notas, una era con sus eventos, una historia con sus páginas), y sus
// repositorios ya saben devolverlo junto: aquí se reutilizan. Lo nuevo es borrar para siempre, que además borra de
// Storage las fotos, portadas y mapas.
@Injectable()
export class WritingsTrash implements TrashSource, OnModuleInit {
  readonly kinds = ['world', 'note_template', 'character', 'world_note', 'era', 'world_event', 'story', 'page'] as const

  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(TrashRegistry) private readonly registry: TrashRegistry,
    @Inject(WorldsRepository) private readonly worldsRepository: WorldsRepository,
    @Inject(EntriesRepository) private readonly entriesRepository: EntriesRepository,
    @Inject(TimelineRepository) private readonly timelineRepository: TimelineRepository,
    @Inject(StoriesRepository) private readonly storiesRepository: StoriesRepository,
  ) {}

  onModuleInit() {
    this.registry.register(this)
  }

  // El `parent` arma la cadena que la Papelera usa para agrupar: página → historia → mundo, evento → era → mundo,
  // nota → nota de arriba (lugares dentro de lugares) o su plantilla → mundo. `detail` de una nota es su plantilla
  // ("Personaje", "Lugar"…) para que el front diga qué es.
  async list(userId: string): Promise<TrashEntry[]> {
    const db = this.db
    const [worldRows, templateRows, characterRows, noteRows, eraRows, eventRows, storyRows, pageRows] = await Promise.all([
      db.select({ id: worlds.id, name: worlds.name, deletedAt: worlds.deletedAt }).from(worlds).where(and(eq(worlds.userId, userId), isNotNull(worlds.deletedAt))),
      db
        .select({ id: noteTemplates.id, name: noteTemplates.name, worldId: noteTemplates.worldId, deletedAt: noteTemplates.deletedAt })
        .from(noteTemplates)
        .where(and(eq(noteTemplates.userId, userId), isNotNull(noteTemplates.deletedAt))),
      db
        .select({ id: characters.id, name: characters.name, worldId: characters.worldId, deletedAt: characters.deletedAt })
        .from(characters)
        .where(and(eq(characters.userId, userId), isNotNull(characters.deletedAt))),
      db
        .select({ id: worldNotes.id, name: worldNotes.name, templateId: worldNotes.templateId, parentId: worldNotes.parentId, template: noteTemplates.name, deletedAt: worldNotes.deletedAt })
        .from(worldNotes)
        .leftJoin(noteTemplates, eq(noteTemplates.id, worldNotes.templateId))
        .where(and(eq(worldNotes.userId, userId), isNotNull(worldNotes.deletedAt))),
      db.select({ id: worldEras.id, name: worldEras.name, worldId: worldEras.worldId, deletedAt: worldEras.deletedAt }).from(worldEras).where(and(eq(worldEras.userId, userId), isNotNull(worldEras.deletedAt))),
      db
        .select({ id: worldEvents.id, title: worldEvents.title, eraId: worldEvents.eraId, deletedAt: worldEvents.deletedAt })
        .from(worldEvents)
        .where(and(eq(worldEvents.userId, userId), isNotNull(worldEvents.deletedAt))),
      db.select({ id: stories.id, title: stories.title, worldId: stories.worldId, deletedAt: stories.deletedAt }).from(stories).where(and(eq(stories.userId, userId), isNotNull(stories.deletedAt))),
      db.select({ id: pages.id, title: pages.title, kind: pages.kind, storyId: pages.storyId, deletedAt: pages.deletedAt }).from(pages).where(and(eq(pages.userId, userId), isNotNull(pages.deletedAt))),
    ])
    const entry = (kind: TrashKind, row: { id: string; deletedAt: Date | null }, name: string, detail: string | null, parent: TrashEntry['parent']): TrashEntry => ({
      kind,
      id: row.id,
      group: 'writing',
      name,
      detail,
      amountCents: null,
      deletedAt: row.deletedAt!,
      parent,
    })
    return [
      ...worldRows.map((row) => entry('world', row, row.name, null, null)),
      ...templateRows.map((row) => entry('note_template', row, row.name, null, { kind: 'world', id: row.worldId })),
      ...characterRows.map((row) => entry('character', row, row.name, null, { kind: 'world', id: row.worldId })),
      ...noteRows.map((row) => entry('world_note', row, row.name, row.template, row.parentId ? { kind: 'world_note', id: row.parentId } : { kind: 'note_template', id: row.templateId })),
      ...eraRows.map((row) => entry('era', row, row.name, null, { kind: 'world', id: row.worldId })),
      ...eventRows.map((row) => entry('world_event', row, row.title, null, { kind: 'era', id: row.eraId })),
      ...storyRows.map((row) => entry('story', row, row.title, null, row.worldId ? { kind: 'world', id: row.worldId } : null)),
      // `detail` de una página: su tipo (capítulo, nota, página), para "Capítulo: Borrador del baile".
      ...pageRows.map((row) => entry('page', row, row.title, row.kind, row.storyId ? { kind: 'story', id: row.storyId } : null)),
    ]
  }

  async restore(userId: string, kind: TrashKind, id: string) {
    const table = tableOf(kind)
    const at = await deletedAtOf(this.db, table, userId, id)
    if (!at) return null
    const restored = await this.restoreWith(userId, kind, id)
    return restored ? at : null
  }

  // Lo que se va por las llaves foráneas sale de la base, pero sus archivos no: por eso primero se juntan las rutas
  // de Storage de todo lo que se va a ir, se borran las filas y al final los archivos.
  async purge(userId: string, kind: TrashKind, id: string) {
    const table = tableOf(kind)
    const at = await deletedAtOf(this.db, table, userId, id)
    if (!at) return false
    const files: string[] = []
    if (kind === 'world') {
      // Las historias apuntan al mundo con ON DELETE SET NULL: se borran aparte (las que se fueron con él).
      const storyIds = (await this.db.select({ id: stories.id }).from(stories).where(and(eq(stories.userId, userId), eq(stories.worldId, id), eq(stories.deletedAt, at)))).map((row) => row.id)
      files.push(...(await this.worldFiles(userId, id)), ...(await this.pageFiles(userId, storyIds)))
      if (storyIds.length) await this.db.delete(stories).where(and(eq(stories.userId, userId), inArray(stories.id, storyIds)))
    } else if (kind === 'note_template') {
      const rows = await this.db.select({ cover: worldNotes.coverPath }).from(worldNotes).where(and(eq(worldNotes.userId, userId), eq(worldNotes.templateId, id)))
      files.push(...paths(...rows.map((row) => row.cover)))
    } else if (kind === 'character') {
      const [row] = await this.db.select({ image: characters.imagePath, cover: characters.coverPath }).from(characters).where(and(eq(characters.id, id), eq(characters.userId, userId)))
      if (row) files.push(...paths(row.image, row.cover))
    } else if (kind === 'world_note') {
      const [row] = await this.db.select({ cover: worldNotes.coverPath }).from(worldNotes).where(and(eq(worldNotes.id, id), eq(worldNotes.userId, userId)))
      if (row) files.push(...paths(row.cover))
    } else if (kind === 'story') {
      files.push(...(await this.pageFiles(userId, [id])))
    } else if (kind === 'page') {
      const [row] = await this.db.select({ cover: pages.coverPath }).from(pages).where(and(eq(pages.id, id), eq(pages.userId, userId)))
      if (row) files.push(...paths(row.cover))
    }
    const purged = await purgeRow(this.db, table, userId, id)
    if (purged) await this.storage.remove(files)
    return purged
  }

  // Tarea programada: de lo de adentro hacia afuera, para juntar los archivos de cada fila antes de que la llave
  // foránea la borre con su dueño (todo lo de un mundo se borró a la misma hora, así que vence junto).
  async purgeExpired(before: Date) {
    let total = 0
    const expiredPages = await this.db.delete(pages).where(lt(pages.deletedAt, before)).returning({ cover: pages.coverPath })
    total += expiredPages.length
    total += (await this.db.delete(stories).where(lt(stories.deletedAt, before)).returning({ id: stories.id })).length
    const expiredCharacters = await this.db.delete(characters).where(lt(characters.deletedAt, before)).returning({ image: characters.imagePath, cover: characters.coverPath })
    total += expiredCharacters.length
    const expiredNotes = await this.db.delete(worldNotes).where(lt(worldNotes.deletedAt, before)).returning({ cover: worldNotes.coverPath })
    total += expiredNotes.length
    total += (await this.db.delete(worldEvents).where(lt(worldEvents.deletedAt, before)).returning({ id: worldEvents.id })).length
    total += (await this.db.delete(worldEras).where(lt(worldEras.deletedAt, before)).returning({ id: worldEras.id })).length
    total += (await this.db.delete(noteTemplates).where(lt(noteTemplates.deletedAt, before)).returning({ id: noteTemplates.id })).length
    const expiredWorlds = await this.db.delete(worlds).where(lt(worlds.deletedAt, before)).returning({ cover: worlds.coverPath, map: worlds.mapPath })
    total += expiredWorlds.length
    await this.storage.remove([
      ...paths(...expiredPages.map((row) => row.cover)),
      ...paths(...expiredCharacters.flatMap((row) => [row.image, row.cover])),
      ...paths(...expiredNotes.map((row) => row.cover)),
      ...paths(...expiredWorlds.flatMap((row) => [row.cover, row.map])),
    ])
    return total
  }

  private async restoreWith(userId: string, kind: TrashKind, id: string): Promise<unknown> {
    switch (kind) {
      case 'world':
        return this.worldsRepository.restoreWorld(userId, id)
      case 'note_template':
        return this.worldsRepository.restoreTemplate(userId, id)
      case 'character':
        return this.entriesRepository.restoreCharacter(userId, id)
      case 'world_note':
        return this.entriesRepository.restoreNote(userId, id)
      case 'era':
        return this.timelineRepository.restoreEra(userId, id)
      case 'world_event':
        return this.timelineRepository.restoreEvent(userId, id)
      case 'story':
        return this.storiesRepository.restoreStory(userId, id)
      case 'page':
        return this.storiesRepository.restorePage(userId, id)
      default:
        return undefined
    }
  }

  // Las fotos, portadas y el mapa de un mundo y de lo que tiene adentro.
  private async worldFiles(userId: string, worldId: string) {
    const [world] = await this.db.select({ cover: worlds.coverPath, map: worlds.mapPath }).from(worlds).where(and(eq(worlds.id, worldId), eq(worlds.userId, userId)))
    const characterRows = await this.db.select({ image: characters.imagePath, cover: characters.coverPath }).from(characters).where(and(eq(characters.userId, userId), eq(characters.worldId, worldId)))
    const noteRows = await this.db.select({ cover: worldNotes.coverPath }).from(worldNotes).where(and(eq(worldNotes.userId, userId), eq(worldNotes.worldId, worldId)))
    return [
      ...paths(world?.cover ?? null, world?.map ?? null),
      ...paths(...characterRows.flatMap((row) => [row.image, row.cover])),
      ...paths(...noteRows.map((row) => row.cover)),
    ]
  }

  private async pageFiles(userId: string, storyIds: string[]) {
    if (storyIds.length === 0) return []
    const rows = await this.db.select({ cover: pages.coverPath }).from(pages).where(and(eq(pages.userId, userId), inArray(pages.storyId, storyIds)))
    return paths(...rows.map((row) => row.cover))
  }
}

function tableOf(kind: TrashKind) {
  switch (kind) {
    case 'world':
      return worlds
    case 'note_template':
      return noteTemplates
    case 'character':
      return characters
    case 'world_note':
      return worldNotes
    case 'era':
      return worldEras
    case 'world_event':
      return worldEvents
    case 'story':
      return stories
    case 'page':
      return pages
    default:
      throw new Error(`Escritos no maneja "${kind}" en la papelera.`)
  }
}
