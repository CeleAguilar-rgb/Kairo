import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { hit, ModuleSearch } from '../../common/search/module-search.js'
import { matches, PER_KIND, SearchRegistry } from '../../common/search/search.registry.js'
import { reminders } from '../../db/schema/reminders.js'

// Ctrl+K en Recordatorios: por título; `date` es cuándo toca (UTC).
@Injectable()
export class RemindersSearch extends ModuleSearch {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(SearchRegistry) registry: SearchRegistry,
  ) {
    super(registry)
  }

  async search(userId: string, pattern: string) {
    const rows = await this.db
      .select({ id: reminders.id, title: reminders.title, remindAt: reminders.remindAt })
      .from(reminders)
      .where(and(eq(reminders.userId, userId), isNull(reminders.deletedAt), isNull(reminders.doneAt), matches(reminders.title, pattern)))
      .orderBy(desc(reminders.remindAt))
      .limit(PER_KIND)
    return rows.map((row) => hit({ kind: 'reminder', id: row.id, title: row.title, date: row.remindAt.toISOString() }))
  }
}
