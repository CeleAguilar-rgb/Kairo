import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import type { TrashKind } from '@kairo/shared'
import { and, eq, isNotNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { moveByOwner, purgeByOwner, purgeExpiredRows, purgeRow, restoreRow } from '../../common/trash/trash-queries'
import { TrashRegistry } from '../../common/trash/trash.registry'
import type { TrashEntry, TrashParent, TrashSource } from '../../common/trash/trash.types'
import { events } from '../../db/schema/agenda'

// Papelera de Agenda (common/trash/trash.types.ts). Una fila es un evento o una serie completa (decisión #37), así
// que restaurar una serie la devuelve entera. Los eventos de un proyecto (las clases de una materia) se van con él.
@Injectable()
export class AgendaTrash implements TrashSource, OnModuleInit {
  readonly kinds = ['event'] as const

  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(TrashRegistry) private readonly registry: TrashRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this)
  }

  async list(userId: string): Promise<TrashEntry[]> {
    const rows = await this.db
      .select({ id: events.id, title: events.title, date: events.date, projectId: events.projectId, deletedAt: events.deletedAt })
      .from(events)
      .where(and(eq(events.userId, userId), isNotNull(events.deletedAt)))
    // `detail`: la fecha del evento (o de la primera vez, si es una serie), para "Evento · 14 oct".
    return rows.map((row) => ({
      kind: 'event',
      id: row.id,
      group: 'other',
      name: row.title,
      detail: row.date,
      amountCents: null,
      deletedAt: row.deletedAt!,
      parent: row.projectId ? { kind: 'project', id: row.projectId } : null,
    }))
  }

  restore(userId: string, _kind: TrashKind, id: string) {
    return restoreRow(this.db, events, userId, id)
  }

  purge(userId: string, _kind: TrashKind, id: string) {
    return purgeRow(this.db, events, userId, id)
  }

  async trashChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind === 'project') await moveByOwner(this.db, events, events.projectId, userId, [parent.id], { from: null, to: at })
  }

  async restoreChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind === 'project') await moveByOwner(this.db, events, events.projectId, userId, [parent.id], { from: at, to: null })
  }

  async purgeChildren(userId: string, parent: TrashParent) {
    if (parent.kind === 'project') await purgeByOwner(this.db, events, events.projectId, userId, parent.id)
  }

  purgeExpired(before: Date) {
    return purgeExpiredRows(this.db, events, before)
  }
}
