import { Inject, Injectable } from '@nestjs/common'
import type { ProjectKind, ProjectStatus } from '@kairo/shared'
import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { projectLinks, projectObjectives, projects } from '../../db/schema/projects'

export type ProjectFields = {
  name: string
  kind: ProjectKind
  status: ProjectStatus
  description: string | null
  coverPath: string | null
  startedOn: string | null
  goalOn: string | null
}

type LinkFields = { title: string; url: string }

@Injectable()
export class ProjectsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  // La galería: el más reciente primero (así lo muestra la pantalla).
  findAll(userId: string) {
    return this.db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
      .orderBy(desc(projects.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId), isNull(projects.deletedAt)))
      .then((rows) => rows[0])
  }

  findByIds(userId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve([])
    return this.db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt), inArray(projects.id, ids)))
  }

  findObjectives(userId: string, projectId: string) {
    return this.db
      .select()
      .from(projectObjectives)
      .where(and(eq(projectObjectives.projectId, projectId), eq(projectObjectives.userId, userId), isNull(projectObjectives.deletedAt)))
      .orderBy(asc(projectObjectives.position), asc(projectObjectives.createdAt))
  }

  findLinks(userId: string, projectId: string) {
    return this.db
      .select()
      .from(projectLinks)
      .where(and(eq(projectLinks.projectId, projectId), eq(projectLinks.userId, userId), isNull(projectLinks.deletedAt)))
      .orderBy(asc(projectLinks.position), asc(projectLinks.createdAt))
  }

  // El proyecto con sus objetivos y enlaces, juntos o ninguno.
  createWithLists(userId: string, fields: ProjectFields, objectives: string[], links: LinkFields[]) {
    return this.db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values({ userId, ...fields }).returning()
      if (!project) throw new Error('No se pudo crear el proyecto.')
      if (objectives.length > 0) {
        await tx.insert(projectObjectives).values(objectives.map((text, position) => ({ userId, projectId: project.id, text, position })))
      }
      if (links.length > 0) {
        await tx.insert(projectLinks).values(links.map((link, position) => ({ userId, projectId: project.id, ...link, position })))
      }
      return project
    })
  }

  // Editar el formulario reemplaza las dos listas (regla 11: lo que se quita va a la papelera, no se borra de
  // verdad). Los objetivos que conservan su texto conservan su fila, y con ella si estaban cumplidos; lo mismo
  // con un enlace de mismo nombre y dirección. Todo en una transacción: no puede quedar un proyecto a medias.
  updateWithLists(userId: string, id: string, fields: ProjectFields, objectives: string[], links: LinkFields[]) {
    return this.db.transaction(async (tx) => {
      const [project] = await tx
        .update(projects)
        .set({ ...fields, updatedAt: new Date() })
        .where(and(eq(projects.id, id), eq(projects.userId, userId), isNull(projects.deletedAt)))
        .returning()
      if (!project) return undefined
      const now = new Date()

      // Objetivos: cada texto nuevo reutiliza una fila viva con el mismo texto (en orden); lo demás se inserta.
      const currentObjectives = await tx
        .select()
        .from(projectObjectives)
        .where(and(eq(projectObjectives.projectId, id), eq(projectObjectives.userId, userId), isNull(projectObjectives.deletedAt)))
        .orderBy(asc(projectObjectives.position), asc(projectObjectives.createdAt))
      const unusedObjectives = new Map<string, typeof currentObjectives>()
      for (const row of currentObjectives) unusedObjectives.set(row.text, [...(unusedObjectives.get(row.text) ?? []), row])
      for (const [position, text] of objectives.entries()) {
        const reused = unusedObjectives.get(text)?.shift()
        if (reused) {
          if (reused.position !== position) {
            await tx.update(projectObjectives).set({ position, updatedAt: now }).where(and(eq(projectObjectives.id, reused.id), eq(projectObjectives.userId, userId)))
          }
        } else {
          await tx.insert(projectObjectives).values({ userId, projectId: id, text, position })
        }
      }
      const removedObjectives = [...unusedObjectives.values()].flat().map((row) => row.id)
      if (removedObjectives.length > 0) {
        await tx
          .update(projectObjectives)
          .set({ deletedAt: now })
          .where(and(inArray(projectObjectives.id, removedObjectives), eq(projectObjectives.userId, userId)))
      }

      // Enlaces: igual, con "nombre + dirección" como identidad.
      const currentLinks = await tx
        .select()
        .from(projectLinks)
        .where(and(eq(projectLinks.projectId, id), eq(projectLinks.userId, userId), isNull(projectLinks.deletedAt)))
        .orderBy(asc(projectLinks.position), asc(projectLinks.createdAt))
      const unusedLinks = new Map<string, typeof currentLinks>()
      for (const row of currentLinks) {
        const key = JSON.stringify([row.title, row.url])
        unusedLinks.set(key, [...(unusedLinks.get(key) ?? []), row])
      }
      for (const [position, link] of links.entries()) {
        const reused = unusedLinks.get(JSON.stringify([link.title, link.url]))?.shift()
        if (reused) {
          if (reused.position !== position) {
            await tx.update(projectLinks).set({ position, updatedAt: now }).where(and(eq(projectLinks.id, reused.id), eq(projectLinks.userId, userId)))
          }
        } else {
          await tx.insert(projectLinks).values({ userId, projectId: id, ...link, position })
        }
      }
      const removedLinks = [...unusedLinks.values()].flat().map((row) => row.id)
      if (removedLinks.length > 0) {
        await tx.update(projectLinks).set({ deletedAt: now }).where(and(inArray(projectLinks.id, removedLinks), eq(projectLinks.userId, userId)))
      }

      return project
    })
  }

  // Un enlace más al final de la lista (el de la pestaña Archivos). El proyecto tiene que ser de la persona.
  async addLink(userId: string, projectId: string, link: LinkFields) {
    const project = await this.findOne(userId, projectId)
    if (!project) return undefined
    const [last] = await this.db
      .select({ position: max(projectLinks.position) })
      .from(projectLinks)
      .where(and(eq(projectLinks.projectId, projectId), eq(projectLinks.userId, userId), isNull(projectLinks.deletedAt)))
    const [row] = await this.db
      .insert(projectLinks)
      .values({ userId, projectId, ...link, position: (last?.position ?? -1) + 1 })
      .returning()
    return row
  }

  async setNotes(userId: string, id: string, notes: string | null) {
    const [row] = await this.db
      .update(projects)
      .set({ notes, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId), isNull(projects.deletedAt)))
      .returning()
    return row
  }

  async setGoalOn(userId: string, id: string, goalOn: string | null) {
    const [row] = await this.db
      .update(projects)
      .set({ goalOn, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId), isNull(projects.deletedAt)))
      .returning()
    return row
  }

  // Marca o desmarca un objetivo. `where` lleva el proyecto Y la persona: el objetivo de otro proyecto (o de
  // otra persona) no se toca aunque se conozca su id.
  async toggleObjective(userId: string, projectId: string, objectiveId: string) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(projectObjectives)
        .where(
          and(
            eq(projectObjectives.id, objectiveId),
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.userId, userId),
            isNull(projectObjectives.deletedAt),
          ),
        )
      if (!current) return undefined
      const [row] = await tx
        .update(projectObjectives)
        .set({ done: !current.done, updatedAt: new Date() })
        .where(eq(projectObjectives.id, objectiveId))
        .returning()
      return row
    })
  }
}
