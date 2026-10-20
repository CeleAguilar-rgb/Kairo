import { Inject, Injectable } from '@nestjs/common'
import type { TransactionKind } from '@kairo/shared'
import { and, desc, eq, gte, isNotNull, isNull, lt, ne, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { transactions } from '../../db/schema/finance'

export type NewTransaction = {
  kind: TransactionKind
  amountCents: number
  currency: string
  concept: string
  note: string
  occurredOn: string
  categoryId: string | null
  cardId: string | null
  savingId: string | null
  debtId: string | null
  repeatMonthly: boolean
}

@Injectable()
export class TransactionsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // Del más nuevo al más viejo; dentro de un mismo día, lo último que se agregó queda arriba.
  findFrom(userId: string, from: string) {
    return this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt), gte(transactions.occurredOn, from)))
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .then((rows) => rows[0])
  }

  async create(userId: string, data: NewTransaction) {
    const [row] = await this.db.insert(transactions).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear el movimiento.')
    return row
  }

  // `membershipId` no está en los campos editables: un movimiento que nació de una membresía conserva su
  // origen aunque se corrija.
  async update(userId: string, id: string, data: NewTransaction) {
    const [row] = await this.db
      .update(transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .returning()
    return row
  }

  async softDelete(userId: string, id: string) {
    const [row] = await this.db
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .returning({ id: transactions.id })
    return row
  }

  async restore(userId: string, id: string) {
    await this.db
      .update(transactions)
      .set({ deletedAt: null })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
  }

  // --- Lo que se calcula de los movimientos (SUM, nunca un saldo guardado) -----------------------------

  // Lo ahorrado en un ahorro: aportes menos retiros. `excludeId` deja fuera un movimiento (el que se está
  // corrigiendo) para que no cuente contra sí mismo al revisar el límite.
  async savedOf(userId: string, savingId: string, excludeId: string | null = null): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(case when ${transactions.kind} = 'saving_deposit' then ${transactions.amountCents} when ${transactions.kind} = 'saving_withdrawal' then -${transactions.amountCents} else 0 end), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.savingId, savingId),
          isNull(transactions.deletedAt),
          excludeId ? ne(transactions.id, excludeId) : undefined,
        ),
      )
    return Math.max(0, Number(row?.total ?? 0))
  }

  // Lo pagado de una deuda: la suma de sus pagos.
  async paidOf(userId: string, debtId: string, excludeId: string | null = null): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${transactions.amountCents}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.debtId, debtId),
          eq(transactions.kind, 'debt_payment'),
          isNull(transactions.deletedAt),
          excludeId ? ne(transactions.id, excludeId) : undefined,
        ),
      )
    return Number(row?.total ?? 0)
  }

  // Lo ahorrado en cada ahorro de una persona, de un golpe.
  async savedTotals(userId: string): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        savingId: transactions.savingId,
        total: sql<string>`coalesce(sum(case when ${transactions.kind} = 'saving_deposit' then ${transactions.amountCents} when ${transactions.kind} = 'saving_withdrawal' then -${transactions.amountCents} else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt), isNotNull(transactions.savingId)))
      .groupBy(transactions.savingId)
    return new Map(rows.map((row) => [row.savingId as string, Number(row.total)]))
  }

  // Lo pagado de cada deuda y el día de su último pago, de un golpe.
  async debtTotals(userId: string): Promise<Map<string, { paidCents: number; lastPaymentOn: string | null }>> {
    const rows = await this.db
      .select({
        debtId: transactions.debtId,
        total: sql<string>`coalesce(sum(${transactions.amountCents}), 0)`,
        lastPaymentOn: sql<string | null>`max(${transactions.occurredOn})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.kind, 'debt_payment'),
          isNull(transactions.deletedAt),
          isNotNull(transactions.debtId),
        ),
      )
      .groupBy(transactions.debtId)
    return new Map(rows.map((row) => [row.debtId as string, { paidCents: Number(row.total), lastPaymentOn: row.lastPaymentOn }]))
  }

  // Lo gastado por categoría en un rango de días (de `from` incluido a `until` sin incluir). Una fila con
  // categoryId nulo es un gasto sin categoría (la categoría se purgó de la papelera).
  async spentByCategory(userId: string, from: string, until: string) {
    const rows = await this.db
      .select({ categoryId: transactions.categoryId, total: sql<string>`coalesce(sum(${transactions.amountCents}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.kind, 'expense'),
          isNull(transactions.deletedAt),
          gte(transactions.occurredOn, from),
          lt(transactions.occurredOn, until),
        ),
      )
      .groupBy(transactions.categoryId)
    return rows.map((row) => ({ categoryId: row.categoryId, cents: Number(row.total) }))
  }
}
