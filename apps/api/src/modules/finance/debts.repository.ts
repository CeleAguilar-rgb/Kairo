import { Inject, Injectable } from '@nestjs/common'
import type { DebtKind } from '@kairo/shared'
import { and, asc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { debts } from '../../db/schema/finance'

type NewDebt = {
  name: string
  kind: DebtKind
  totalCents: number
  currency: string
  annualInterestPct: number | null
  monthlyPaymentCents: number | null
  nextPaymentOn: string | null
}

@Injectable()
export class DebtsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findLive(userId: string) {
    return this.db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), isNull(debts.deletedAt)))
      .orderBy(asc(debts.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
      .then((rows) => rows[0])
  }

  async create(userId: string, data: NewDebt) {
    const [row] = await this.db.insert(debts).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear la deuda.')
    return row
  }

  // Sus pagos se quedan en los movimientos (la historia no se borra): solo deja de salir en la lista.
  async softDelete(userId: string, id: string) {
    const [row] = await this.db
      .update(debts)
      .set({ deletedAt: new Date() })
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
      .returning({ id: debts.id })
    return row
  }

  async restore(userId: string, id: string) {
    await this.db
      .update(debts)
      .set({ deletedAt: null })
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
  }
}
