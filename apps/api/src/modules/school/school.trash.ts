import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module.js'
import { moveByOwner, purgeByOwner, purgeExpiredRows } from '../../common/trash/trash-queries.js'
import { TrashRegistry } from '../../common/trash/trash.registry.js'
import type { TrashParent, TrashSource } from '../../common/trash/trash.types.js'
import { subjects } from '../../db/schema/school.js'

// Papelera de Escuela (common/trash/trash.types.ts). Una materia ES un proyecto `school` (decisión #43): en la
// Papelera sale su proyecto (el front lo nombra "Materia"), y la fila de la materia (profesor, color,
// calificaciones) va, vuelve y se borra con él.
@Injectable()
export class SchoolTrash implements TrashSource, OnModuleInit {
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
    if (parent.kind === 'project') await moveByOwner(this.db, subjects, subjects.projectId, userId, [parent.id], { from: null, to: at })
  }

  async restoreChildren(userId: string, parent: TrashParent, at: Date) {
    if (parent.kind === 'project') await moveByOwner(this.db, subjects, subjects.projectId, userId, [parent.id], { from: at, to: null })
  }

  async purgeChildren(userId: string, parent: TrashParent) {
    if (parent.kind === 'project') await purgeByOwner(this.db, subjects, subjects.projectId, userId, parent.id)
  }

  purgeExpired(before: Date) {
    return purgeExpiredRows(this.db, subjects, before)
  }
}
