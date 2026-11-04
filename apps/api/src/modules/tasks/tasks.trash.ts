import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import type { TrashKind } from '@kairo/shared'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { deletedAtOf, moveByOwner, purgeByOwner, purgeExpiredRows, purgeRow } from '../../common/trash/trash-queries'
import { TrashRegistry } from '../../common/trash/trash.registry'
import type { TrashEntry, TrashParent, TrashSource } from '../../common/trash/trash.types'
import { tasks } from '../../db/schema/tasks'

// Papelera de Tareas (common/trash/trash.types.ts). Una subtarea nunca sale sola: va y vuelve con su tarea. Las
// tareas de un proyecto se van con él (Borrar.dc.html: "¿Borrar Bot de marketing y sus 4 tareas?").
@Injectable()
export class TasksTrash implements TrashSource, OnModuleInit {
  readonly kinds = ['task'] as const

  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(TrashRegistry) private readonly registry: TrashRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this)
  }

  async list(userId: string): Promise<TrashEntry[]> {
    const rows = await this.db
      .select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId, deletedAt: tasks.deletedAt })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNotNull(tasks.deletedAt), isNull(tasks.parentTaskId)))
    return rows.map((row) => ({
      kind: 'task',
      id: row.id,
      group: 'task',
      name: row.title,
      detail: null,
      amountCents: null,
      deletedAt: row.deletedAt!,
      parent: row.projectId ? { kind: 'project', id: row.projectId } : null,
    }))
  }

  async restore(userId: string, _kind: TrashKind, id: string) {
    const at = await deletedAtOf(this.db, tasks, userId, id)
    if (!at) return null
    await this.db.transaction(async (tx) => {
      await tx.update(tasks).set({ deletedAt: null }).where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.deletedAt, at)))
      await moveByOwner(tx, tasks, tasks.parentTaskId, userId, [id], { from: at, to: null })
    })
    return at
  }

  // Sus subtareas se van por la llave foránea (ON DELETE CASCADE).
  purge(userId: string, _kind: TrashKind, id: string) {
    return purgeRow(this.db, tasks, userId, id)
  }

  async trashChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind !== 'project') return
    await this.moveProjectTasks(userId, parent.id, { from: null, to: at })
  }

  async restoreChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind !== 'project') return
    await this.moveProjectTasks(userId, parent.id, { from: at, to: null })
  }

  async purgeChildren(userId: string, parent: TrashParent) {
    if (parent.kind !== 'project') return
    await purgeByOwner(this.db, tasks, tasks.projectId, userId, parent.id)
  }

  purgeExpired(before: Date) {
    return purgeExpiredRows(this.db, tasks, before)
  }

  // Una subtarea no lleva el proyecto, solo su tarea padre: por eso se mueven primero las tareas y luego sus
  // subtareas, en una transacción.
  private moveProjectTasks(userId: string, projectId: string, move: { from: Date | null; to: Date | null }) {
    return this.db.transaction(async (tx) => {
      const parents = await moveByOwner(tx, tasks, tasks.projectId, userId, [projectId], move)
      await moveByOwner(tx, tasks, tasks.parentTaskId, userId, parents, move)
    })
  }
}
