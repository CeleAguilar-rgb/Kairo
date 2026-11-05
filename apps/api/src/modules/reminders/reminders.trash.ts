import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNotNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { RowsTrash } from '../../common/trash/rows-trash.js'
import { TrashRegistry } from '../../common/trash/trash.registry.js'
import { reminders } from '../../db/schema/reminders.js'

// Papelera de Recordatorios (common/trash/rows-trash.ts). `detail`: cuándo tocaba (UTC); el front lo muestra en la
// zona del perfil.
@Injectable()
export class RemindersTrash extends RowsTrash {
  constructor(@Inject(DB) db: PostgresJsDatabase, @Inject(TrashRegistry) registry: TrashRegistry) {
    super(db, registry, [
      {
        kind: 'reminder',
        table: reminders,
        list: async (userId) => {
          const rows = await db
            .select({ id: reminders.id, title: reminders.title, remindAt: reminders.remindAt, deletedAt: reminders.deletedAt })
            .from(reminders)
            .where(and(eq(reminders.userId, userId), isNotNull(reminders.deletedAt)))
          return rows.map((row) => ({ kind: 'reminder', id: row.id, group: 'other', name: row.title, detail: row.remindAt.toISOString(), amountCents: null, deletedAt: row.deletedAt!, parent: null }))
        },
      },
    ])
  }
}
