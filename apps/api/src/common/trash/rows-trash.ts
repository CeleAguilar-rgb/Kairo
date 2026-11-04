import type { OnModuleInit } from '@nestjs/common'
import type { TrashKind } from '@kairo/shared'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { purgeExpiredRows, purgeRow, restoreRow } from './trash-queries'
import type { TrashRegistry } from './trash.registry'
import type { TrashEntry, TrashSource } from './trash.types'

// Un tipo de la papelera que es UNA fila sin partes internas que cuidar (un recordatorio, un gasto): su tabla y
// cómo listar lo borrado de la persona.
export type RowKind = {
  kind: TrashKind
  table: PgTable & { id: PgColumn; userId: PgColumn; deletedAt: PgColumn }
  list: (userId: string) => Promise<TrashEntry[]>
}

// Base para los adaptadores de papelera hechos solo de filas sueltas: restaurar, borrar para siempre y la tarea de
// los 30 días son iguales para todas. Cada módulo la extiende con SUS tablas (`<módulo>.trash.ts`) y puede
// reemplazar `restore` o `purge` para un tipo que arrastre algo (una tarjeta y sus membresías).
export abstract class RowsTrash implements TrashSource, OnModuleInit {
  readonly kinds: readonly TrashKind[]

  protected constructor(
    protected readonly db: PostgresJsDatabase,
    private readonly registry: TrashRegistry,
    private readonly rows: RowKind[],
  ) {
    this.kinds = rows.map((row) => row.kind)
  }

  onModuleInit() {
    this.registry.register(this)
  }

  async list(userId: string) {
    return (await Promise.all(this.rows.map((row) => row.list(userId)))).flat()
  }

  restore(userId: string, kind: TrashKind, id: string): Promise<Date | null> {
    return restoreRow(this.db, this.tableOf(kind), userId, id)
  }

  purge(userId: string, kind: TrashKind, id: string): Promise<boolean> {
    return purgeRow(this.db, this.tableOf(kind), userId, id)
  }

  async purgeExpired(before: Date) {
    let total = 0
    for (const row of this.rows) total += await purgeExpiredRows(this.db, row.table, before)
    return total
  }

  protected tableOf(kind: TrashKind) {
    const row = this.rows.find((candidate) => candidate.kind === kind)
    if (!row) throw new Error(`Este adaptador no maneja "${kind}".`)
    return row.table
  }
}
