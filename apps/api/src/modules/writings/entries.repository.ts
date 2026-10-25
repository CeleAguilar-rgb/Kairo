import { Inject, Injectable } from '@nestjs/common'
import type { CoverColor, CoverMode, EntryExtraInput, TiptapDoc } from '@kairo/shared'
import { and, asc, eq, getTableColumns, inArray, isNull, max } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { characters, worldNotes } from '../../db/schema/writings'

export type CharacterRow = typeof characters.$inferSelect
export type NoteRow = typeof worldNotes.$inferSelect
// En las listas no viaja `content` (los bloques de la página completa): puede ser grande y ninguna lista lo usa.
export type CharacterListRow = Omit<CharacterRow, 'content'>
export type NoteListRow = Omit<NoteRow, 'content'>

// Lo que se puede cambiar de una ficha (personaje o nota). `values` ya viene juntado con lo que había: el service
// lo arma, aquí solo se guarda.
export type EntryPatch = Partial<{
  name: string
  summary: string
  draft: boolean
  values: Record<string, unknown>
  extras: EntryExtraInput[]
  url: string | null
  content: TiptapDoc
  coverMode: CoverMode
  coverColor: CoverColor | null
  coverPosition: number
  coverPath: string | null
}>

// Las columnas de una tabla menos `content`, para las listas.
function withoutContent<T extends { content: unknown }>(columns: T): Omit<T, 'content'> {
  const copy: Partial<T> = { ...columns }
  delete copy.content
  return copy as Omit<T, 'content'>
}

const characterListColumns = withoutContent(getTableColumns(characters))
const noteListColumns = withoutContent(getTableColumns(worldNotes))

// Personajes y notas del mundo (especies, lugares y lo de las secciones extra). Siempre con `userId` en el
// `where` (security.md #4).
@Injectable()
export class EntriesRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // --- Personajes -----------------------------------------------------------------------------------------

  findCharacters(userId: string, worldId?: string): Promise<CharacterListRow[]> {
    return this.db
      .select(characterListColumns)
      .from(characters)
      .where(and(eq(characters.userId, userId), isNull(characters.deletedAt), worldId ? eq(characters.worldId, worldId) : undefined))
      .orderBy(asc(characters.position), asc(characters.createdAt))
  }

  findCharacter(userId: string, id: string) {
    return this.db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId), isNull(characters.deletedAt)))
      .then((rows) => rows[0])
  }

  // Al final de la lista del mundo.
  async createCharacter(userId: string, worldId: string, name: string, values: Record<string, unknown>) {
    const [last] = await this.db
      .select({ value: max(characters.position) })
      .from(characters)
      .where(and(eq(characters.userId, userId), eq(characters.worldId, worldId)))
    const [row] = await this.db
      .insert(characters)
      .values({ userId, worldId, name, values, position: (last?.value ?? -1) + 1 })
      .returning()
    if (!row) throw new Error('No se pudo crear el personaje.')
    return row
  }

  updateCharacter(userId: string, id: string, patch: EntryPatch & { sections?: string[]; imagePath?: string | null }) {
    return this.db
      .update(characters)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(characters.id, id), eq(characters.userId, userId), isNull(characters.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  softDeleteCharacter(userId: string, id: string) {
    return this.db
      .update(characters)
      .set({ deletedAt: new Date() })
      .where(and(eq(characters.id, id), eq(characters.userId, userId), isNull(characters.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  restoreCharacter(userId: string, id: string) {
    return this.db
      .update(characters)
      .set({ deletedAt: null })
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .returning()
      .then((rows) => rows[0])
  }

  // Un personaje borrado (para "Deshacer"): el único lugar donde se lee algo que está en la papelera.
  findDeletedCharacter(userId: string, id: string) {
    return this.db
      .select({ id: characters.id, worldId: characters.worldId, deletedAt: characters.deletedAt })
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .then((rows) => rows[0])
  }

  // --- Notas del mundo ---------------------------------------------------------------------------------------

  findNotes(userId: string, worldId?: string): Promise<NoteListRow[]> {
    return this.db
      .select(noteListColumns)
      .from(worldNotes)
      .where(and(eq(worldNotes.userId, userId), isNull(worldNotes.deletedAt), worldId ? eq(worldNotes.worldId, worldId) : undefined))
      .orderBy(asc(worldNotes.position), asc(worldNotes.createdAt))
  }

  findNote(userId: string, id: string) {
    return this.db
      .select()
      .from(worldNotes)
      .where(and(eq(worldNotes.id, id), eq(worldNotes.userId, userId), isNull(worldNotes.deletedAt)))
      .then((rows) => rows[0])
  }

  // Al final de las notas de su plantilla.
  async createNote(userId: string, fields: { worldId: string; templateId: string; parentId: string | null; name: string; values: Record<string, unknown> }) {
    const [last] = await this.db
      .select({ value: max(worldNotes.position) })
      .from(worldNotes)
      .where(and(eq(worldNotes.userId, userId), eq(worldNotes.templateId, fields.templateId)))
    const [row] = await this.db
      .insert(worldNotes)
      .values({ userId, ...fields, position: (last?.value ?? -1) + 1 })
      .returning()
    if (!row) throw new Error('No se pudo crear la nota.')
    return row
  }

  updateNote(userId: string, id: string, patch: EntryPatch & { parentId?: string | null }) {
    return this.db
      .update(worldNotes)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(worldNotes.id, id), eq(worldNotes.userId, userId), isNull(worldNotes.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  // Una nota y los lugares que tiene dentro (los ids los calcula el service) se van juntos, con la misma marca.
  async softDeleteNotes(userId: string, ids: string[]) {
    if (ids.length === 0) return []
    return this.db
      .update(worldNotes)
      .set({ deletedAt: new Date() })
      .where(and(eq(worldNotes.userId, userId), inArray(worldNotes.id, ids), isNull(worldNotes.deletedAt)))
      .returning({ id: worldNotes.id })
  }

  // Devuelve la nota y las que se fueron con ella (misma marca de tiempo, en el mismo mundo).
  restoreNote(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(worldNotes).where(and(eq(worldNotes.id, id), eq(worldNotes.userId, userId)))
      if (!current?.deletedAt) return undefined
      await tx
        .update(worldNotes)
        .set({ deletedAt: null })
        .where(and(eq(worldNotes.userId, userId), eq(worldNotes.worldId, current.worldId), eq(worldNotes.deletedAt, current.deletedAt)))
      return { ...current, deletedAt: null }
    })
  }
}
