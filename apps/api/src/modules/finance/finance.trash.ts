import { Inject, Injectable } from '@nestjs/common'
import type { TrashKind } from '@kairo/shared'
import { and, eq, isNotNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { RowsTrash } from '../../common/trash/rows-trash.js'
import { deletedAtOf, moveByOwner } from '../../common/trash/trash-queries.js'
import { TrashRegistry } from '../../common/trash/trash.registry.js'
import { cards, categories, debts, memberships, savingsGoals, transactions } from '../../db/schema/finance.js'

// Papelera de Finanzas (common/trash/rows-trash.ts). Todo es una fila suelta salvo la tarjeta, que se lleva sus
// membresías (cards.repository.ts, `deleteWithMemberships`): esas salen dentro de ella y vuelven con ella.
// Borrar para siempre una tarjeta o una categoría NO toca los movimientos viejos: su llave foránea queda en null y
// el front ya sabe contarlos en "Otros" (decisión #40).
@Injectable()
export class FinanceTrash extends RowsTrash {
  constructor(@Inject(DB) db: PostgresJsDatabase, @Inject(TrashRegistry) registry: TrashRegistry) {
    super(db, registry, [
      {
        // `amountCents` con `detail` = ingreso o gasto: el front escribe "Café de la tarde · $65".
        kind: 'transaction',
        table: transactions,
        list: async (userId) => {
          const rows = await db
            .select({ id: transactions.id, concept: transactions.concept, kind: transactions.kind, amountCents: transactions.amountCents, deletedAt: transactions.deletedAt })
            .from(transactions)
            .where(and(eq(transactions.userId, userId), isNotNull(transactions.deletedAt)))
          return rows.map((row) => ({ kind: 'transaction', id: row.id, group: 'finance', name: row.concept, detail: row.kind, amountCents: row.amountCents, deletedAt: row.deletedAt!, parent: null }))
        },
      },
      {
        // `detail`: los últimos 4 de su tarjeta ("Membresía · Débito ••4417"), si tiene.
        kind: 'membership',
        table: memberships,
        list: async (userId) => {
          const rows = await db
            .select({ id: memberships.id, name: memberships.name, amountCents: memberships.amountCents, cardId: memberships.cardId, last4: cards.last4, deletedAt: memberships.deletedAt })
            .from(memberships)
            .leftJoin(cards, and(eq(cards.id, memberships.cardId), eq(cards.userId, userId)))
            .where(and(eq(memberships.userId, userId), isNotNull(memberships.deletedAt)))
          return rows.map((row) => ({
            kind: 'membership',
            id: row.id,
            group: 'finance',
            name: row.name,
            detail: row.last4,
            amountCents: row.amountCents,
            deletedAt: row.deletedAt!,
            parent: row.cardId ? { kind: 'card', id: row.cardId } : null,
          }))
        },
      },
      {
        kind: 'card',
        table: cards,
        list: async (userId) => {
          const rows = await db
            .select({ id: cards.id, name: cards.name, last4: cards.last4, deletedAt: cards.deletedAt })
            .from(cards)
            .where(and(eq(cards.userId, userId), isNotNull(cards.deletedAt)))
          return rows.map((row) => ({ kind: 'card', id: row.id, group: 'finance', name: row.name, detail: row.last4, amountCents: null, deletedAt: row.deletedAt!, parent: null }))
        },
      },
      {
        kind: 'saving',
        table: savingsGoals,
        list: async (userId) => {
          const rows = await db
            .select({ id: savingsGoals.id, name: savingsGoals.name, deletedAt: savingsGoals.deletedAt })
            .from(savingsGoals)
            .where(and(eq(savingsGoals.userId, userId), isNotNull(savingsGoals.deletedAt)))
          return rows.map((row) => ({ kind: 'saving', id: row.id, group: 'finance', name: row.name, detail: null, amountCents: null, deletedAt: row.deletedAt!, parent: null }))
        },
      },
      {
        kind: 'debt',
        table: debts,
        list: async (userId) => {
          const rows = await db
            .select({ id: debts.id, name: debts.name, deletedAt: debts.deletedAt })
            .from(debts)
            .where(and(eq(debts.userId, userId), isNotNull(debts.deletedAt)))
          return rows.map((row) => ({ kind: 'debt', id: row.id, group: 'finance', name: row.name, detail: null, amountCents: null, deletedAt: row.deletedAt!, parent: null }))
        },
      },
      {
        kind: 'category',
        table: categories,
        list: async (userId) => {
          const rows = await db
            .select({ id: categories.id, name: categories.name, deletedAt: categories.deletedAt })
            .from(categories)
            .where(and(eq(categories.userId, userId), isNotNull(categories.deletedAt)))
          return rows.map((row) => ({ kind: 'category', id: row.id, group: 'finance', name: row.name, detail: null, amountCents: null, deletedAt: row.deletedAt!, parent: null }))
        },
      },
    ])
  }

  // La tarjeta vuelve con las membresías que se fueron con ella (misma hora), no con las que se borraron antes.
  override async restore(userId: string, kind: TrashKind, id: string) {
    if (kind !== 'card') return super.restore(userId, kind, id)
    const at = await deletedAtOf(this.db, cards, userId, id)
    if (!at) return null
    await this.db.transaction(async (tx) => {
      await moveByOwner(tx, cards, cards.id, userId, [id], { from: at, to: null })
      await moveByOwner(tx, memberships, memberships.cardId, userId, [id], { from: at, to: null })
    })
    return at
  }

  // Y se borra para siempre con ellas: si no, la llave foránea las dejaría sueltas y sin tarjeta en la papelera.
  override async purge(userId: string, kind: TrashKind, id: string) {
    if (kind !== 'card') return super.purge(userId, kind, id)
    const at = await deletedAtOf(this.db, cards, userId, id)
    if (!at) return false
    await this.db.delete(memberships).where(and(eq(memberships.cardId, id), eq(memberships.userId, userId), eq(memberships.deletedAt, at)))
    return super.purge(userId, kind, id)
  }
}
