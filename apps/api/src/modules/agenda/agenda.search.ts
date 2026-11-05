import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { hit, ModuleSearch } from '../../common/search/module-search.js'
import { matches, PER_KIND, SearchRegistry } from '../../common/search/search.registry.js'
import { events } from '../../db/schema/agenda.js'

// Ctrl+K en Agenda: por título. `date` es el día (o el primero de una serie) y `detail` su minuto de inicio.
@Injectable()
export class AgendaSearch extends ModuleSearch {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(SearchRegistry) registry: SearchRegistry,
  ) {
    super(registry)
  }

  async search(userId: string, pattern: string) {
    const rows = await this.db
      .select({ id: events.id, title: events.title, date: events.date, startMin: events.startMin })
      .from(events)
      .where(and(eq(events.userId, userId), isNull(events.deletedAt), matches(events.title, pattern)))
      .orderBy(desc(events.date))
      .limit(PER_KIND)
    return rows.map((row) => hit({ kind: 'event', id: row.id, title: row.title, date: row.date, detail: row.startMin === null ? null : String(row.startMin) }))
  }
}
