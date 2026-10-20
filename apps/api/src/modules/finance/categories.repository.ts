import { Inject, Injectable } from '@nestjs/common'
import { DEFAULT_CATEGORIES, type CategoryColor, type CategoryKind } from '@kairo/shared'
import { and, asc, eq, isNull, max, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { categories } from '../../db/schema/finance'

type NewCategory = { name: string; kind: CategoryKind; color: CategoryColor; monthlyLimitCents: number | null; position: number }

@Injectable()
export class CategoriesRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // Cada tipo en su orden; los de gasto primero (así lo lista el presupuesto).
  findLive(userId: string) {
    return this.db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
      .orderBy(asc(sql`case when ${categories.kind} = 'expense' then 0 else 1 end`), asc(categories.position), asc(categories.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)))
      .then((rows) => rows[0])
  }

  // Crea las categorías de arranque la primera vez que una persona abre Finanzas. "Primera vez" = no tiene
  // ninguna fila de categorías, ni siquiera en la papelera: así borrar las suyas no las hace volver. Si dos
  // peticiones llegan a la vez, el índice único (user_id, key) hace que la segunda no duplique nada.
  async ensureDefaults(userId: string) {
    const [existing] = await this.db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId)).limit(1)
    if (existing) return
    await this.db
      .insert(categories)
      .values(
        DEFAULT_CATEGORIES.map((category, position) => ({
          userId,
          key: category.key,
          name: category.name,
          kind: category.kind,
          color: category.color,
          icon: category.icon,
          monthlyLimitCents: null,
          position,
        })),
      )
      .onConflictDoNothing()
  }

  // La categoría que recibe los gastos de las que se borran ("Otros"). La busca por su clave.
  findByKey(userId: string, key: string) {
    return this.db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.key, key), isNull(categories.deletedAt)))
      .then((rows) => rows[0])
  }

  async lastPosition(userId: string, kind: CategoryKind): Promise<number> {
    const [row] = await this.db
      .select({ position: max(categories.position) })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.kind, kind), isNull(categories.deletedAt)))
    return row?.position ?? 0
  }

  // ¿Ya hay una categoría viva de ese tipo con ese nombre (sin importar mayúsculas)?
  async nameTaken(userId: string, kind: CategoryKind, name: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.kind, kind),
          isNull(categories.deletedAt),
          sql`lower(${categories.name}) = lower(${name})`,
        ),
      )
      .limit(1)
    return Boolean(row)
  }

  async create(userId: string, data: NewCategory) {
    const [row] = await this.db.insert(categories).values({ userId, icon: 'tag', ...data }).returning()
    if (!row) throw new Error('No se pudo crear la categoría.')
    return row
  }

  async setLimit(userId: string, id: string, monthlyLimitCents: number | null) {
    const [row] = await this.db
      .update(categories)
      .set({ monthlyLimitCents, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)))
      .returning()
    return row
  }

  async softDelete(userId: string, id: string) {
    const [row] = await this.db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)))
      .returning({ id: categories.id })
    return row
  }

  async restore(userId: string, id: string) {
    await this.db
      .update(categories)
      .set({ deletedAt: null })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
  }
}
