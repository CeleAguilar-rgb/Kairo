import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import type { TrashKind } from '@kairo/shared'
import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { StorageService } from '../../common/storage/storage.service'
import { TrashRegistry } from '../../common/trash/trash.registry'
import type { TrashEntry, TrashSource } from '../../common/trash/trash.types'
import { projectLinks, projectObjectives, projects } from '../../db/schema/projects'
import { storagePathOf } from './projects.service'

// Papelera de Proyectos (common/trash/trash.types.ts). Un proyecto es lo único que se manda a la papelera DESDE la
// Papelera (Borrar.dc.html): sus objetivos y enlaces se van con él aquí, y lo de otros módulos (tareas, eventos,
// sprints, archivos, la materia) lo mueve cada uno con su `trashChildren`, a la misma hora.
@Injectable()
export class ProjectsTrash implements TrashSource, OnModuleInit {
  readonly kinds = ['project'] as const

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
      .select({ id: projects.id, name: projects.name, kind: projects.kind, deletedAt: projects.deletedAt })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNotNull(projects.deletedAt)))
    // `detail` lleva el tipo de proyecto: el front dice "Materia" en vez de "Proyecto" si es de Escuela.
    return rows.map((row) => ({ kind: 'project', id: row.id, group: 'project', name: row.name, detail: row.kind, amountCents: null, deletedAt: row.deletedAt!, parent: null }))
  }

  trash(userId: string, _kind: TrashKind, id: string, at: Date) {
    return this.setDeleted(userId, id, { from: null, to: at })
  }

  async restore(userId: string, _kind: TrashKind, id: string) {
    const [row] = await this.db
      .select({ deletedAt: projects.deletedAt })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId), isNotNull(projects.deletedAt)))
    if (!row?.deletedAt) return null
    return (await this.setDeleted(userId, id, { from: row.deletedAt, to: null })) ? row.deletedAt : null
  }

  async purge(userId: string, _kind: TrashKind, id: string) {
    // Objetivos y enlaces se van por la llave foránea; la portada subida hay que borrarla de Storage aparte.
    const [row] = await this.db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId), isNotNull(projects.deletedAt)))
      .returning({ coverPath: projects.coverPath })
    if (!row) return false
    await this.removeCovers([row.coverPath])
    return true
  }

  async purgeExpired(before: Date) {
    const rows = await this.db.delete(projects).where(lt(projects.deletedAt, before)).returning({ coverPath: projects.coverPath })
    await this.removeCovers(rows.map((row) => row.coverPath))
    return rows.length
  }

  // Ir a la papelera (`from` null) o volver de ella (`from` = la hora en que se fue): el proyecto y sus listas, en una
  // transacción. Al volver solo regresan los objetivos y enlaces que se fueron con él, no los que se quitaron antes
  // al editar el formulario.
  private setDeleted(userId: string, id: string, { from, to }: { from: Date | null; to: Date | null }) {
    return this.db.transaction(async (tx) => {
      const [project] = await tx
        .update(projects)
        .set({ deletedAt: to })
        .where(and(eq(projects.id, id), eq(projects.userId, userId), from ? eq(projects.deletedAt, from) : isNull(projects.deletedAt)))
        .returning({ id: projects.id })
      if (!project) return false
      const objectivesWhen = from ? eq(projectObjectives.deletedAt, from) : isNull(projectObjectives.deletedAt)
      await tx
        .update(projectObjectives)
        .set({ deletedAt: to })
        .where(and(eq(projectObjectives.projectId, id), eq(projectObjectives.userId, userId), objectivesWhen))
      const linksWhen = from ? eq(projectLinks.deletedAt, from) : isNull(projectLinks.deletedAt)
      await tx
        .update(projectLinks)
        .set({ deletedAt: to })
        .where(and(eq(projectLinks.projectId, id), eq(projectLinks.userId, userId), linksWhen))
      return true
    })
  }

  private async removeCovers(coverPaths: (string | null)[]) {
    await this.storage.remove(coverPaths.map(storagePathOf).filter((path): path is string => path !== null))
  }
}
