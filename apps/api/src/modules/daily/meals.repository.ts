import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { mealPlans } from '../../db/schema/daily'

type Meal = 'breakfast' | 'lunch' | 'dinner'
type PlanFields = { dish: string; prep: boolean; note: string | null; done: boolean }

@Injectable()
export class MealsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findInRange(userId: string, from: string, to: string) {
    return this.db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, userId),
          isNull(mealPlans.deletedAt),
          gte(mealPlans.planDate, from),
          lte(mealPlans.planDate, to),
        ),
      )
  }

  findOne(userId: string, planDate: string, meal: Meal) {
    return this.db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, userId),
          eq(mealPlans.planDate, planDate),
          eq(mealPlans.meal, meal),
          isNull(mealPlans.deletedAt),
        ),
      )
      .then((rows) => rows[0])
  }

  async upsert(userId: string, planDate: string, meal: Meal, data: PlanFields) {
    const current = await this.findOne(userId, planDate, meal)
    if (current) {
      const [row] = await this.db.update(mealPlans).set(data).where(eq(mealPlans.id, current.id)).returning()
      return row
    }
    const [row] = await this.db.insert(mealPlans).values({ userId, planDate, meal, ...data }).returning()
    return row
  }

  async setDone(userId: string, planDate: string, meal: Meal, done: boolean) {
    const current = await this.findOne(userId, planDate, meal)
    if (!current) return undefined
    const [row] = await this.db.update(mealPlans).set({ done }).where(eq(mealPlans.id, current.id)).returning()
    return row
  }

  // Devuelve los ids que borró (para el token de Deshacer): clearWeekAction sí ofrece "Deshacer" en el
  // front, a diferencia de quitar un solo platillo.
  async softDeleteInRange(userId: string, from: string, to: string) {
    const rows = await this.findInRange(userId, from, to)
    if (rows.length === 0) return []
    const ids = rows.map((row) => row.id)
    await this.db.update(mealPlans).set({ deletedAt: new Date() }).where(inArray(mealPlans.id, ids))
    return ids
  }

  async softDeleteOne(userId: string, planDate: string, meal: Meal) {
    const current = await this.findOne(userId, planDate, meal)
    if (!current) return false
    await this.db.update(mealPlans).set({ deletedAt: new Date() }).where(eq(mealPlans.id, current.id))
    return true
  }

  async restoreMany(userId: string, ids: string[]) {
    if (ids.length === 0) return
    await this.db.update(mealPlans).set({ deletedAt: null }).where(and(eq(mealPlans.userId, userId), inArray(mealPlans.id, ids)))
  }
}
