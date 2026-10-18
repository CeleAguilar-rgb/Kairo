import { Inject, Injectable } from '@nestjs/common'
import type { JournalTag } from '@kairo/shared'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { journalEntries } from '../../db/schema/daily'

type EntryFields = { mood: number; body: string; gratitude: string[]; tags: JournalTag[]; summary: string[] }

@Injectable()
export class JournalRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findAll(userId: string) {
    return this.db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), isNull(journalEntries.deletedAt)))
      .orderBy(desc(journalEntries.entryDate))
  }

  findByDate(userId: string, entryDate: string) {
    return this.db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), eq(journalEntries.entryDate, entryDate), isNull(journalEntries.deletedAt)))
      .then((rows) => rows[0])
  }

  // Una por día: si ya existe, se reemplaza completa (igual que saveJournalAction).
  async upsert(userId: string, entryDate: string, data: EntryFields) {
    const current = await this.findByDate(userId, entryDate)
    if (current) {
      const [row] = await this.db
        .update(journalEntries)
        .set({ ...data, savedAt: new Date() })
        .where(eq(journalEntries.id, current.id))
        .returning()
      return row
    }
    const [row] = await this.db.insert(journalEntries).values({ userId, entryDate, ...data }).returning()
    return row
  }

  async softDelete(userId: string, entryDate: string) {
    const current = await this.findByDate(userId, entryDate)
    if (!current) return undefined
    await this.db.update(journalEntries).set({ deletedAt: new Date() }).where(eq(journalEntries.id, current.id))
    return current
  }

  async restore(userId: string, id: string) {
    await this.db.update(journalEntries).set({ deletedAt: null }).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
  }
}
