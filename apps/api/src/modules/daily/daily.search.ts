import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { hit, ModuleSearch } from '../../common/search/module-search'
import { matches, PER_KIND, SearchRegistry } from '../../common/search/search.registry'
import { goals } from '../../db/schema/daily'

// Ctrl+K en Día a día: las metas, por título (`detail`: su estado).
@Injectable()
export class DailySearch extends ModuleSearch {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(SearchRegistry) registry: SearchRegistry,
  ) {
    super(registry)
  }

  async search(userId: string, pattern: string) {
    const rows = await this.db
      .select({ id: goals.id, title: goals.title, status: goals.status, dueOn: goals.dueOn })
      .from(goals)
      .where(and(eq(goals.userId, userId), isNull(goals.deletedAt), matches(goals.title, pattern)))
      .orderBy(asc(goals.createdAt))
      .limit(PER_KIND)
    return rows.map((row) => hit({ kind: 'goal', id: row.id, title: row.title, detail: row.status, date: row.dueOn }))
  }
}
