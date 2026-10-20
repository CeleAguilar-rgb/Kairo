import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { events } from '../../db/schema/agenda'

type EventInsert = typeof events.$inferInsert
type EventUpdate = Partial<Omit<EventInsert, 'id' | 'userId'>>

@Injectable()
export class AgendaRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findAll(userId: string) {
    return this.db
      .select()
      .from(events)
      .where(and(eq(events.userId, userId), isNull(events.deletedAt)))
  }

  async findOne(userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.userId, userId), isNull(events.deletedAt)))
    return row
  }

  async create(userId: string, data: Omit<EventInsert, 'userId'>) {
    const [row] = await this.db.insert(events).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear el evento.')
    return row
  }

  // where: { id, userId } también al editar (security.md #4).
  async update(userId: string, id: string, data: EventUpdate) {
    const [row] = await this.db
      .update(events)
      .set(data)
      .where(and(eq(events.id, id), eq(events.userId, userId), isNull(events.deletedAt)))
      .returning()
    return row
  }

  async softDelete(userId: string, id: string) {
    const [row] = await this.db
      .update(events)
      .set({ deletedAt: new Date() })
      .where(and(eq(events.id, id), eq(events.userId, userId), isNull(events.deletedAt)))
      .returning()
    return row
  }

  // Todos los eventos de un proyecto (las series enteras, no una vez), a la papelera juntos: lo usa borrar una
  // materia de Escuela.
  async softDeleteByProject(userId: string, projectId: string) {
    await this.db
      .update(events)
      .set({ deletedAt: new Date() })
      .where(and(eq(events.userId, userId), eq(events.projectId, projectId), isNull(events.deletedAt)))
  }

  async restore(userId: string, id: string) {
    const [row] = await this.db
      .update(events)
      .set({ deletedAt: null })
      .where(and(eq(events.id, id), eq(events.userId, userId)))
      .returning()
    return row
  }
}
