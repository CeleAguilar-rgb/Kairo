import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNotNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { RowsTrash } from '../../common/trash/rows-trash.js'
import { TrashRegistry } from '../../common/trash/trash.registry.js'
import { goals, journalEntries, mealPlans } from '../../db/schema/daily.js'

// Papelera de Día a día (common/trash/rows-trash.ts): metas (sus hitos y su bitácora se van por la llave foránea al
// borrarla para siempre), entradas del diario y comidas del menú. Las rutinas y sus bloques NO entran: borrarlos para
// siempre se llevaría el historial del reporte (ver TRASH_KINDS en @kairo/shared).
@Injectable()
export class DailyTrash extends RowsTrash {
  constructor(@Inject(DB) db: PostgresJsDatabase, @Inject(TrashRegistry) registry: TrashRegistry) {
    super(db, registry, [
      {
        kind: 'goal',
        table: goals,
        list: async (userId) => {
          const rows = await db
            .select({ id: goals.id, title: goals.title, area: goals.area, deletedAt: goals.deletedAt })
            .from(goals)
            .where(and(eq(goals.userId, userId), isNotNull(goals.deletedAt)))
          return rows.map((row) => ({ kind: 'goal', id: row.id, group: 'other', name: row.title, detail: row.area, amountCents: null, deletedAt: row.deletedAt!, parent: null }))
        },
      },
      {
        // El diario no tiene título: el nombre es el día (el front lo escribe "Diario del 14 de octubre").
        kind: 'journal_entry',
        table: journalEntries,
        list: async (userId) => {
          const rows = await db
            .select({ id: journalEntries.id, entryDate: journalEntries.entryDate, deletedAt: journalEntries.deletedAt })
            .from(journalEntries)
            .where(and(eq(journalEntries.userId, userId), isNotNull(journalEntries.deletedAt)))
          return rows.map((row) => ({ kind: 'journal_entry', id: row.id, group: 'other', name: row.entryDate, detail: null, amountCents: null, deletedAt: row.deletedAt!, parent: null }))
        },
      },
      {
        // `detail`: "<día> <comida>" (2026-10-14 lunch), para "Comida del martes".
        kind: 'meal',
        table: mealPlans,
        list: async (userId) => {
          const rows = await db
            .select({ id: mealPlans.id, dish: mealPlans.dish, planDate: mealPlans.planDate, meal: mealPlans.meal, deletedAt: mealPlans.deletedAt })
            .from(mealPlans)
            .where(and(eq(mealPlans.userId, userId), isNotNull(mealPlans.deletedAt)))
          return rows.map((row) => ({ kind: 'meal', id: row.id, group: 'other', name: row.dish, detail: `${row.planDate} ${row.meal}`, amountCents: null, deletedAt: row.deletedAt!, parent: null }))
        },
      },
    ])
  }
}
