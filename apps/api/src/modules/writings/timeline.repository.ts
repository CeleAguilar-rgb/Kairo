import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, inArray, isNull, max } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { worldEras, worldEvents } from '../../db/schema/writings'

export type EraRow = typeof worldEras.$inferSelect
export type EventRow = typeof worldEvents.$inferSelect

export type EraPatch = Partial<{ name: string; shortName: string; summary: string; note: string }>
export type EventPatch = Partial<{
  title: string
  description: string
  causes: string
  consequences: string
  notes: string[]
  who: string[]
  where: string[]
  eraId: string
  position: number
}>

// La línea del tiempo de un mundo: sus eras en orden y los eventos de cada una. Siempre con `userId` en el `where`.
@Injectable()
export class TimelineRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // --- Eras ---------------------------------------------------------------------------------------------

  findEras(userId: string, worldId?: string) {
    return this.db
      .select()
      .from(worldEras)
      .where(and(eq(worldEras.userId, userId), isNull(worldEras.deletedAt), worldId ? eq(worldEras.worldId, worldId) : undefined))
      .orderBy(asc(worldEras.position), asc(worldEras.createdAt))
  }

  findEra(userId: string, id: string) {
    return this.db
      .select()
      .from(worldEras)
      .where(and(eq(worldEras.id, id), eq(worldEras.userId, userId), isNull(worldEras.deletedAt)))
      .then((rows) => rows[0])
  }

  // Una era nueva va al final de la línea.
  async createEra(userId: string, worldId: string, name: string) {
    const [last] = await this.db
      .select({ value: max(worldEras.position) })
      .from(worldEras)
      .where(and(eq(worldEras.userId, userId), eq(worldEras.worldId, worldId)))
    const [row] = await this.db
      .insert(worldEras)
      .values({ userId, worldId, name, position: (last?.value ?? -1) + 1 })
      .returning()
    if (!row) throw new Error('No se pudo crear la era.')
    return row
  }

  updateEra(userId: string, id: string, patch: EraPatch) {
    return this.db
      .update(worldEras)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(worldEras.id, id), eq(worldEras.userId, userId), isNull(worldEras.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  // Reordenar: la lista completa de ids en su orden nuevo (la arma el service con las flechas). Una transacción,
  // para que nunca queden dos eras con la misma posición a medias.
  reorderEras(userId: string, orderedIds: string[]) {
    return this.db.transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx
          .update(worldEras)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(worldEras.id, id), eq(worldEras.userId, userId)))
      }
    })
  }

  // Una era se va a la papelera con sus eventos (misma marca de tiempo, para que "Deshacer" los devuelva juntos).
  softDeleteEra(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const at = new Date()
      const [era] = await tx
        .update(worldEras)
        .set({ deletedAt: at })
        .where(and(eq(worldEras.id, id), eq(worldEras.userId, userId), isNull(worldEras.deletedAt)))
        .returning()
      if (!era) return undefined
      await tx.update(worldEvents).set({ deletedAt: at }).where(and(eq(worldEvents.userId, userId), eq(worldEvents.eraId, id), isNull(worldEvents.deletedAt)))
      return era
    })
  }

  restoreEra(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(worldEras).where(and(eq(worldEras.id, id), eq(worldEras.userId, userId)))
      if (!current?.deletedAt) return undefined
      const [era] = await tx.update(worldEras).set({ deletedAt: null }).where(and(eq(worldEras.id, id), eq(worldEras.userId, userId))).returning()
      await tx.update(worldEvents).set({ deletedAt: null }).where(and(eq(worldEvents.userId, userId), eq(worldEvents.eraId, id), eq(worldEvents.deletedAt, current.deletedAt)))
      return era
    })
  }

  // --- Eventos ----------------------------------------------------------------------------------------

  // Los eventos de varias eras (las de un mundo, o todas las de la persona).
  findEvents(userId: string, eraIds: string[]) {
    if (eraIds.length === 0) return Promise.resolve([] as EventRow[])
    return this.db
      .select()
      .from(worldEvents)
      .where(and(eq(worldEvents.userId, userId), isNull(worldEvents.deletedAt), inArray(worldEvents.eraId, eraIds)))
      .orderBy(asc(worldEvents.position), asc(worldEvents.createdAt))
  }

  findEvent(userId: string, id: string) {
    return this.db
      .select()
      .from(worldEvents)
      .where(and(eq(worldEvents.id, id), eq(worldEvents.userId, userId), isNull(worldEvents.deletedAt)))
      .then((rows) => rows[0])
  }

  async nextEventPosition(userId: string, eraId: string) {
    const [last] = await this.db
      .select({ value: max(worldEvents.position) })
      .from(worldEvents)
      .where(and(eq(worldEvents.userId, userId), eq(worldEvents.eraId, eraId), isNull(worldEvents.deletedAt)))
    return (last?.value ?? -1) + 1
  }

  async createEvent(userId: string, eraId: string, title: string) {
    const position = await this.nextEventPosition(userId, eraId)
    const [row] = await this.db.insert(worldEvents).values({ userId, eraId, title, position }).returning()
    if (!row) throw new Error('No se pudo crear el evento.')
    return row
  }

  updateEvent(userId: string, id: string, patch: EventPatch) {
    return this.db
      .update(worldEvents)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(worldEvents.id, id), eq(worldEvents.userId, userId), isNull(worldEvents.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  reorderEvents(userId: string, orderedIds: string[]) {
    return this.db.transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx
          .update(worldEvents)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(worldEvents.id, id), eq(worldEvents.userId, userId)))
      }
    })
  }

  softDeleteEvent(userId: string, id: string) {
    return this.db
      .update(worldEvents)
      .set({ deletedAt: new Date() })
      .where(and(eq(worldEvents.id, id), eq(worldEvents.userId, userId), isNull(worldEvents.deletedAt)))
      .returning()
      .then((rows) => rows[0])
  }

  // Un evento solo vuelve si su era sigue viva (si no, volvería "colgado" de una era en la papelera).
  async restoreEvent(userId: string, id: string) {
    const [current] = await this.db.select().from(worldEvents).where(and(eq(worldEvents.id, id), eq(worldEvents.userId, userId)))
    if (!current?.deletedAt) return undefined
    const era = await this.findEra(userId, current.eraId)
    if (!era) return undefined
    return this.db
      .update(worldEvents)
      .set({ deletedAt: null })
      .where(and(eq(worldEvents.id, id), eq(worldEvents.userId, userId)))
      .returning()
      .then((rows) => rows[0])
  }
}
