import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { hit, ModuleSearch } from '../../common/search/module-search'
import { matches, PER_KIND, SearchRegistry } from '../../common/search/search.registry'
import { projects } from '../../db/schema/projects'

// Ctrl+K en Proyectos: por nombre. `detail` es su tipo (uno de Escuela lleva a /escuela).
@Injectable()
export class ProjectsSearch extends ModuleSearch {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(SearchRegistry) registry: SearchRegistry,
  ) {
    super(registry)
  }

  async search(userId: string, pattern: string) {
    const rows = await this.db
      .select({ id: projects.id, name: projects.name, kind: projects.kind })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt), matches(projects.name, pattern)))
      .orderBy(desc(projects.createdAt))
      .limit(PER_KIND)
    return rows.map((row) => hit({ kind: 'project', id: row.id, title: row.name, detail: row.kind }))
  }
}
