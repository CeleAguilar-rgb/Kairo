import { Inject, Injectable } from '@nestjs/common'
import type { FocusKind } from '@kairo/shared'
import { and, asc, eq, gte, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { focusSessions } from '../../db/schema/focus.js'

export type NewFocusSession = { kind: FocusKind; startedAt: Date; minutes: number; taskId: string | null }

// Siempre con `userId` en el `where` (security.md #4).
@Injectable()
export class FocusRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  create(userId: string, session: NewFocusSession) {
    return this.db
      .insert(focusSessions)
      .values({ userId, ...session })
      .returning()
      .then((rows) => {
        if (!rows[0]) throw new Error('No se pudo guardar la sesión.')
        return rows[0]
      })
  }

  findSince(userId: string, from: Date) {
    return this.db
      .select()
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, userId), isNull(focusSessions.deletedAt), gte(focusSessions.startedAt, from)))
      .orderBy(asc(focusSessions.startedAt))
  }
}
