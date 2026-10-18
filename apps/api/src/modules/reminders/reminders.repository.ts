import { Inject, Injectable } from '@nestjs/common'
import type { ReminderRepeat } from '@kairo/shared'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { reminders } from '../../db/schema/reminders'

type NewReminder = { title: string; remindAt: Date; repeat: ReminderRepeat; spawnedFromId?: string }

@Injectable()
export class RemindersRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // Pendientes (sin marcar como listos), el que toca primero arriba: por la
  // hora a la que se pospuso o, si no, la suya.
  findUpcoming(userId: string) {
    return this.db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), isNull(reminders.deletedAt), isNull(reminders.doneAt)))
      .orderBy(asc(sql`coalesce(${reminders.snoozedTo}, ${reminders.remindAt})`))
  }

  async create(userId: string, data: NewReminder) {
    const [row] = await this.db.insert(reminders).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear el recordatorio.')
    return row
  }

  // where: { id, userId } también al completar (security.md #4).
  async complete(userId: string, id: string) {
    const [row] = await this.db
      .update(reminders)
      .set({ doneAt: new Date() })
      .where(
        and(
          eq(reminders.id, id),
          eq(reminders.userId, userId),
          isNull(reminders.deletedAt),
          isNull(reminders.doneAt),
        ),
      )
      .returning()
    return row
  }

  // "Deshacer" de completar: reabre la original y borra la siguiente vez que
  // hubiera nacido de ella (si el recordatorio se repetía). No hay papelera
  // para recordatorios (el canvas no trae "Borrar"), así que esta fila
  // auxiliar se borra de verdad, no con deletedAt.
  async uncomplete(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(reminders)
        .where(and(eq(reminders.spawnedFromId, id), eq(reminders.userId, userId)))

      const [row] = await tx
        .update(reminders)
        .set({ doneAt: null })
        .where(
          and(
            eq(reminders.id, id),
            eq(reminders.userId, userId),
            isNull(reminders.deletedAt),
          ),
        )
        .returning()
      return row
    })
  }

  async snooze(userId: string, id: string, snoozedTo: Date) {
    const [row] = await this.db
      .update(reminders)
      .set({ snoozedTo })
      .where(
        and(
          eq(reminders.id, id),
          eq(reminders.userId, userId),
          isNull(reminders.deletedAt),
          isNull(reminders.doneAt),
        ),
      )
      .returning()
    return row
  }

  async unsnooze(userId: string, id: string) {
    const [row] = await this.db
      .update(reminders)
      .set({ snoozedTo: null })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId), isNull(reminders.deletedAt)))
      .returning()
    return row
  }
}
