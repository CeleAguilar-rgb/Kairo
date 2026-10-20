import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, inArray, isNull, max, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { sprints, sprintTasks } from '../../db/schema/sprints'

export type NewSprint = { number: number; goal: string; startsOn: string; endsOn: string }

@Injectable()
export class SprintsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findActive(userId: string, projectId: string) {
    return this.db
      .select()
      .from(sprints)
      .where(and(eq(sprints.userId, userId), eq(sprints.projectId, projectId), eq(sprints.status, 'active'), isNull(sprints.deletedAt)))
      .then((rows) => rows[0])
  }

  // Los cerrados, del más reciente al más antiguo.
  findClosed(userId: string, projectId: string) {
    return this.db
      .select()
      .from(sprints)
      .where(and(eq(sprints.userId, userId), eq(sprints.projectId, projectId), eq(sprints.status, 'closed'), isNull(sprints.deletedAt)))
      .orderBy(desc(sprints.number))
  }

  async lastNumber(userId: string, projectId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: max(sprints.number) })
      .from(sprints)
      .where(and(eq(sprints.userId, userId), eq(sprints.projectId, projectId)))
    return row?.value ?? 0
  }

  async create(userId: string, projectId: string, data: NewSprint) {
    const [row] = await this.db.insert(sprints).values({ userId, projectId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear el sprint.')
    return row
  }

  // Los ids de las tareas que entraron a un sprint.
  async taskIdsOf(userId: string, sprintId: string): Promise<string[]> {
    const rows = await this.db
      .select({ taskId: sprintTasks.taskId })
      .from(sprintTasks)
      .where(and(eq(sprintTasks.userId, userId), eq(sprintTasks.sprintId, sprintId)))
    return rows.map((row) => row.taskId)
  }

  // Cuántas tareas tuvo cada sprint y cuántas estaban hechas AL CERRARLO (la foto de `sprint_tasks.done`).
  async closedStats(userId: string, sprintIds: string[]): Promise<Map<string, { total: number; done: number }>> {
    if (sprintIds.length === 0) return new Map()
    const rows = await this.db
      .select({
        sprintId: sprintTasks.sprintId,
        total: sql<string>`count(*)`,
        done: sql<string>`count(*) filter (where ${sprintTasks.done} is true)`,
      })
      .from(sprintTasks)
      .where(and(eq(sprintTasks.userId, userId), inArray(sprintTasks.sprintId, sprintIds)))
      .groupBy(sprintTasks.sprintId)
    return new Map(rows.map((row) => [row.sprintId, { total: Number(row.total), done: Number(row.done) }]))
  }

  // Idempotente: meter dos veces la misma tarea no falla ni la duplica (índice único sprint + tarea).
  async addTask(userId: string, sprintId: string, taskId: string) {
    await this.db.insert(sprintTasks).values({ userId, sprintId, taskId }).onConflictDoNothing()
  }

  // Cerrar un sprint y abrir el siguiente es UNA transacción sobre estas dos tablas (las de este módulo): no
  // puede quedar un sprint cerrado sin su siguiente, ni un sprint nuevo con las tareas a medias.
  //  1. El sprint activo pasa a cerrado, con sus notas y la hora.
  //  2. La foto de cada tarea: ¿estaba hecha al cerrar? (el historial no cambia si se termina después).
  //  3. Nace el siguiente, activo, y recibe las tareas sin terminar que se quedaron con él.
  // Devuelve undefined si ese sprint ya no estaba activo (alguien lo cerró un instante antes).
  closeAndStartNext(
    userId: string,
    sprintId: string,
    projectId: string,
    data: { notes: string | null; allTaskIds: string[]; doneTaskIds: string[]; next: NewSprint; carryTaskIds: string[] },
  ) {
    return this.db.transaction(async (tx) => {
      const [closed] = await tx
        .update(sprints)
        .set({ status: 'closed', notes: data.notes, closedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(sprints.id, sprintId), eq(sprints.userId, userId), eq(sprints.status, 'active')))
        .returning({ id: sprints.id })
      if (!closed) return undefined

      if (data.allTaskIds.length > 0) {
        // Todas "no hechas" y luego las hechas: dos actualizaciones con parámetros (nada de armar SQL a mano).
        await tx
          .update(sprintTasks)
          .set({ done: false })
          .where(and(eq(sprintTasks.sprintId, sprintId), eq(sprintTasks.userId, userId)))
        if (data.doneTaskIds.length > 0) {
          await tx
            .update(sprintTasks)
            .set({ done: true })
            .where(and(eq(sprintTasks.sprintId, sprintId), eq(sprintTasks.userId, userId), inArray(sprintTasks.taskId, data.doneTaskIds)))
        }
      }

      const [next] = await tx.insert(sprints).values({ userId, projectId, ...data.next }).returning()
      if (!next) throw new Error('No se pudo crear el siguiente sprint.')
      if (data.carryTaskIds.length > 0) {
        await tx.insert(sprintTasks).values(data.carryTaskIds.map((taskId) => ({ userId, sprintId: next.id, taskId })))
      }
      return next
    })
  }
}
