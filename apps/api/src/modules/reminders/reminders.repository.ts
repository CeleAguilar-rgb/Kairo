import { Inject, Injectable } from '@nestjs/common'
import type { ReminderRepeat } from '@kairo/shared'
import { and, asc, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { reminders } from '../../db/schema/reminders.js'

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

  // Posponer también borra `notifiedAt`: así la tarea programada vuelve a avisar a la hora nueva.
  async snooze(userId: string, id: string, snoozedTo: Date) {
    const [row] = await this.db
      .update(reminders)
      .set({ snoozedTo, notifiedAt: null })
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

  // Tarea programada (de todas las personas, por eso sin userId): los pendientes que ya tocan y no se han avisado.
  // Solo los que tocaron después de `since`: uno que se quedó sin avisar hace una semana ya no sirve como aviso.
  findDue(now: Date, since: Date, limit: number) {
    // Un fragmento `sql` no sabe de qué tipo son las fechas que se le comparan: van como texto con el tipo a la vista.
    const dueAt = sql<Date>`coalesce(${reminders.snoozedTo}, ${reminders.remindAt})`
    return this.db
      .select({ id: reminders.id, userId: reminders.userId, title: reminders.title, dueAt: dueAt.mapWith(reminders.remindAt) })
      .from(reminders)
      .where(and(isNull(reminders.deletedAt), isNull(reminders.doneAt), isNull(reminders.notifiedAt), lte(dueAt, sql`${now.toISOString()}::timestamptz`), gt(dueAt, sql`${since.toISOString()}::timestamptz`)))
      .orderBy(asc(dueAt))
      .limit(limit)
  }

  async markNotified(ids: string[], at: Date) {
    if (ids.length) await this.db.update(reminders).set({ notifiedAt: at }).where(and(inArray(reminders.id, ids), isNull(reminders.notifiedAt)))
  }
}
