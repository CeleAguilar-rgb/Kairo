import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { financeSettings } from '../../db/schema/finance'

@Injectable()
export class SettingsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  find(userId: string) {
    return this.db
      .select()
      .from(financeSettings)
      .where(eq(financeSettings.userId, userId))
      .then((rows) => rows[0])
  }

  // Una fila por persona: la crea la primera vez que se guardan los avisos.
  async upsertAlerts(userId: string, data: { budgetAlertAt80: boolean; budgetAlertOver: boolean }) {
    const [row] = await this.db
      .insert(financeSettings)
      .values({ userId, ...data })
      .onConflictDoUpdate({ target: financeSettings.userId, set: { ...data, updatedAt: new Date() } })
      .returning()
    if (!row) throw new Error('No se pudieron guardar los avisos.')
    return row
  }
}
