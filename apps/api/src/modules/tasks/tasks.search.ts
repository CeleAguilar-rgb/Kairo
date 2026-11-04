import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { hit, ModuleSearch } from '../../common/search/module-search'
import { matches, PER_KIND, SearchRegistry } from '../../common/search/search.registry'
import { tasks } from '../../db/schema/tasks'

// Ctrl+K en Tareas: por título, solo tareas (no subtareas) vivas. `parentId` es su proyecto y `date` su fecha.
@Injectable()
export class TasksSearch extends ModuleSearch {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(SearchRegistry) registry: SearchRegistry,
  ) {
    super(registry)
  }

  async search(userId: string, pattern: string) {
    const rows = await this.db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueOn: tasks.dueOn, projectId: tasks.projectId })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), isNull(tasks.parentTaskId), matches(tasks.title, pattern)))
      .orderBy(asc(tasks.position))
      .limit(PER_KIND)
    return rows.map((row) => hit({ kind: 'task', id: row.id, title: row.title, detail: row.status, date: row.dueOn, parentId: row.projectId }))
  }
}
