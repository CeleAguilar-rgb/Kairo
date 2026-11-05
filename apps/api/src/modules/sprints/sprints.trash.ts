import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { moveByOwner, purgeByOwner, purgeExpiredRows } from '../../common/trash/trash-queries.js'
import { TrashRegistry } from '../../common/trash/trash.registry.js'
import type { TrashParent, TrashSource } from '../../common/trash/trash.types.js'
import { sprints } from '../../db/schema/sprints.js'

// Papelera de Sprints (common/trash/trash.types.ts). Un sprint no se borra solo (no sale en la Papelera): solo se va,
// vuelve y se borra para siempre con su proyecto. Su relación con las tareas (`sprint_tasks`) se queda como estaba.
@Injectable()
export class SprintsTrash implements TrashSource, OnModuleInit {
  readonly kinds = [] as const

  constructor(
    @Inject(DB) private readonly db: PostgresJsDatabase,
    @Inject(TrashRegistry) private readonly registry: TrashRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this)
  }

  async list() {
    return []
  }

  async restore() {
    return null
  }

  async purge() {
    return false
  }

  async trashChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind === 'project') await moveByOwner(this.db, sprints, sprints.projectId, userId, [parent.id], { from: null, to: at })
  }

  async restoreChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind === 'project') await moveByOwner(this.db, sprints, sprints.projectId, userId, [parent.id], { from: at, to: null })
  }

  async purgeChildren(userId: string, parent: TrashParent) {
    if (parent.kind === 'project') await purgeByOwner(this.db, sprints, sprints.projectId, userId, parent.id)
  }

  purgeExpired(before: Date) {
    return purgeExpiredRows(this.db, sprints, before)
  }
}
