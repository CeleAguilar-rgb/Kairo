import { Inject, Injectable } from '@nestjs/common'
import type { CreateTaskInput } from '@kairo/shared'
import { and, asc, count, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { tasks } from '../../db/schema/tasks'

@Injectable()
export class TasksRepository {
  // @Inject() explícito, mismo motivo que en account.repository.ts
  // (docs/history/current.md, Bloqueos).
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findActive(userId: string) {
    return this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.position))
  }

  async countActive(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    return row?.value ?? 0
  }

  async create(userId: string, data: CreateTaskInput & { position: number }) {
    const [task] = await this.db
      .insert(tasks)
      .values({ userId, ...data })
      .returning()
    return task
  }

  // where: { id, userId } también al editar (security.md #4): sin esa fila,
  // devuelve undefined y el service responde 404, nunca toca la de otro.
  async complete(userId: string, taskId: string) {
    const [task] = await this.db
      .update(tasks)
      .set({ status: 'done', doneAt: new Date() })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
        ),
      )
      .returning()
    return task
  }
}
