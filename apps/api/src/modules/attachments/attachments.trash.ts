import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import type { TrashKind } from '@kairo/shared'
import { and, eq, isNotNull, lt } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { StorageService } from '../../common/storage/storage.service'
import { moveByOwner, restoreRow } from '../../common/trash/trash-queries'
import { TrashRegistry } from '../../common/trash/trash.registry'
import type { TrashEntry, TrashParent, TrashSource } from '../../common/trash/trash.types'
import { attachments } from '../../db/schema/attachments'

// Papelera de Archivos (common/trash/trash.types.ts). A diferencia de las demás, borrar para siempre también borra el
// archivo de Storage (security.md: "incluidos sus archivos"); por eso aquí no se usa `purgeRow`.
@Injectable()
export class AttachmentsTrash implements TrashSource, OnModuleInit {
  readonly kinds = ['attachment'] as const

  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(TrashRegistry) private readonly registry: TrashRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this)
  }

  async list(userId: string): Promise<TrashEntry[]> {
    const rows = await this.db
      .select({ id: attachments.id, name: attachments.name, projectId: attachments.projectId, deletedAt: attachments.deletedAt })
      .from(attachments)
      .where(and(eq(attachments.userId, userId), isNotNull(attachments.deletedAt)))
    return rows.map((row) => ({
      kind: 'attachment',
      id: row.id,
      group: 'project',
      name: row.name,
      detail: null,
      amountCents: null,
      deletedAt: row.deletedAt!,
      parent: { kind: 'project', id: row.projectId },
    }))
  }

  restore(userId: string, _kind: TrashKind, id: string) {
    return restoreRow(this.db, attachments, userId, id)
  }

  async purge(userId: string, _kind: TrashKind, id: string) {
    const rows = await this.db
      .delete(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.userId, userId), isNotNull(attachments.deletedAt)))
      .returning({ storagePath: attachments.storagePath })
    await this.storage.remove(rows.map((row) => row.storagePath))
    return rows.length > 0
  }

  async trashChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind === 'project') await moveByOwner(this.db, attachments, attachments.projectId, userId, [parent.id], { from: null, to: at })
  }

  async restoreChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind === 'project') await moveByOwner(this.db, attachments, attachments.projectId, userId, [parent.id], { from: at, to: null })
  }

  async purgeChildren(userId: string, parent: TrashParent) {
    if (parent.kind !== 'project') return
    const rows = await this.db
      .delete(attachments)
      .where(and(eq(attachments.projectId, parent.id), eq(attachments.userId, userId), isNotNull(attachments.deletedAt)))
      .returning({ storagePath: attachments.storagePath })
    await this.storage.remove(rows.map((row) => row.storagePath))
  }

  async purgeExpired(before: Date) {
    const rows = await this.db.delete(attachments).where(lt(attachments.deletedAt, before)).returning({ storagePath: attachments.storagePath })
    await this.storage.remove(rows.map((row) => row.storagePath))
    return rows.length
  }
}
