import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNull, or } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { hit, ModuleSearch } from '../../common/search/module-search'
import { matches, PER_KIND, SearchRegistry } from '../../common/search/search.registry'
import { memberships, transactions } from '../../db/schema/finance'

// Ctrl+K en Finanzas: movimientos por concepto o nota (el más reciente primero) y membresías por nombre.
@Injectable()
export class FinanceSearch extends ModuleSearch {
  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(SearchRegistry) registry: SearchRegistry,
  ) {
    super(registry)
  }

  async search(userId: string, pattern: string) {
    const [movementRows, membershipRows] = await Promise.all([
      this.db
        .select({ id: transactions.id, concept: transactions.concept, kind: transactions.kind, amountCents: transactions.amountCents, occurredOn: transactions.occurredOn })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt), or(matches(transactions.concept, pattern), matches(transactions.note, pattern))))
        .orderBy(desc(transactions.occurredOn))
        .limit(PER_KIND),
      this.db
        .select({ id: memberships.id, name: memberships.name, amountCents: memberships.amountCents })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), isNull(memberships.deletedAt), matches(memberships.name, pattern)))
        .limit(PER_KIND),
    ])
    return [
      ...movementRows.map((row) => hit({ kind: 'transaction', id: row.id, title: row.concept, detail: row.kind, date: row.occurredOn, amountCents: row.amountCents })),
      ...membershipRows.map((row) => hit({ kind: 'membership', id: row.id, title: row.name, amountCents: row.amountCents })),
    ]
  }
}
