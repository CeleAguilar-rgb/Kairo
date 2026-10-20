import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { savingsGoals } from '../../db/schema/finance'

type NewSaving = { name: string; targetCents: number; currency: string; dueOn: string | null }

@Injectable()
export class SavingsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findLive(userId: string) {
    return this.db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.userId, userId), isNull(savingsGoals.deletedAt)))
      .orderBy(asc(savingsGoals.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId), isNull(savingsGoals.deletedAt)))
      .then((rows) => rows[0])
  }

  async create(userId: string, data: NewSaving) {
    const [row] = await this.db.insert(savingsGoals).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear el ahorro.')
    return row
  }

  // Sus aportes y retiros se quedan en los movimientos (la historia no se borra): solo deja de salir en la lista.
  async softDelete(userId: string, id: string) {
    const [row] = await this.db
      .update(savingsGoals)
      .set({ deletedAt: new Date() })
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId), isNull(savingsGoals.deletedAt)))
      .returning({ id: savingsGoals.id })
    return row
  }

  async restore(userId: string, id: string) {
    await this.db
      .update(savingsGoals)
      .set({ deletedAt: null })
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
  }
}
