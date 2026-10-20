import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { ProjectInput, ProjectLinkInput } from '@kairo/shared'
import { z } from 'zod'
import type { projectLinks, projectObjectives, projects } from '../../db/schema/projects'
import { ProjectsRepository, type ProjectFields } from './projects.repository'

type ProjectRow = typeof projects.$inferSelect
type ObjectiveRow = typeof projectObjectives.$inferSelect
type LinkRow = typeof projectLinks.$inferSelect

// Mientras no exista la subida de imágenes, la portada es una de las ilustradas y se guarda como
// "preset:<clave>" (el front dibuja esa ilustración). Una ruta de Storage tendrá otro prefijo cuando llegue
// el paso de Archivos.
const COVER_PREFIX = 'preset:'

const isUuid = (value: string) => z.uuid().safeParse(value).success

@Injectable()
export class ProjectsService {
  constructor(@Inject(ProjectsRepository) private readonly repository: ProjectsRepository) {}

  // --- API pública para otros módulos (modules.md: nunca leen la tabla de proyectos) ---------------------

  // ¿Existe este proyecto Y es de esta persona? Lo usan Tareas, Agenda y Metas antes de guardar un `projectId`
  // (la llave foránea solo garantiza que exista, no de quién es).
  // Un id que ni siquiera es un uuid (Metas acepta texto libre) simplemente "no existe": llegaría hasta Postgres
  // y fallaría con un 500.
  async exists(userId: string, id: string): Promise<boolean> {
    if (!isUuid(id)) return false
    return Boolean(await this.repository.findOne(userId, id))
  }

  // Nombre de cada proyecto por id, para armar `project: { id, name }` en tareas y eventos. Un id que no es de
  // esta persona (o que ya no existe) simplemente no sale en el resultado.
  async summaries(userId: string, ids: (string | null)[]): Promise<Map<string, { id: string; name: string }>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null && isUuid(id)))]
    const rows = await this.repository.findByIds(userId, unique)
    return new Map(rows.map((row) => [row.id, { id: row.id, name: row.name }]))
  }

  // --- Lo propio -----------------------------------------------------------------------------------------

  async findAll(userId: string) {
    const rows = await this.repository.findAll(userId)
    return rows.map(toProject)
  }

  async findOne(userId: string, id: string) {
    const project = await this.repository.findOne(userId, id)
    if (!project) throw this.notFound()
    return this.detailOf(userId, project)
  }

  async create(userId: string, input: ProjectInput) {
    const project = await this.repository.createWithLists(userId, fieldsOf(input), input.objectives, input.links)
    return this.detailOf(userId, project)
  }

  async update(userId: string, id: string, input: ProjectInput) {
    const project = await this.repository.updateWithLists(userId, id, fieldsOf(input), input.objectives, input.links)
    if (!project) throw this.notFound()
    return this.detailOf(userId, project)
  }

  // Las notas del Resumen: vacías se guardan como nulas.
  async setNotes(userId: string, id: string, notes: string) {
    const row = await this.repository.setNotes(userId, id, notes === '' ? null : notes)
    if (!row) throw this.notFound()
    return { id: row.id, notes: row.notes }
  }

  // La fecha meta elegida desde el Resumen: no puede ser antes del inicio del proyecto.
  async setGoalDate(userId: string, id: string, goalOn: string | null) {
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()
    if (goalOn && current.startedOn && goalOn < current.startedOn) {
      throw new BadRequestException({ code: 'GOAL_BEFORE_START', message: 'La fecha meta no puede ser antes del inicio.' })
    }
    const row = await this.repository.setGoalOn(userId, id, goalOn)
    if (!row) throw this.notFound()
    return { id: row.id, goalOn: row.goalOn }
  }

  // Un enlace suelto desde la pestaña Archivos (solo http/https: lo valida projectLinkSchema).
  async addLink(userId: string, projectId: string, input: ProjectLinkInput) {
    const row = await this.repository.addLink(userId, projectId, input)
    if (!row) throw this.notFound()
    return toLink(row)
  }

  async toggleObjective(userId: string, projectId: string, objectiveId: string) {
    const row = await this.repository.toggleObjective(userId, projectId, objectiveId)
    if (!row) throw new NotFoundException({ code: 'OBJECTIVE_NOT_FOUND', message: 'No encontramos ese objetivo.' })
    return toObjective(row)
  }

  private async detailOf(userId: string, project: ProjectRow) {
    const [objectives, links] = await Promise.all([this.repository.findObjectives(userId, project.id), this.repository.findLinks(userId, project.id)])
    return { ...toProject(project), notes: project.notes, objectives: objectives.map(toObjective), links: links.map(toLink) }
  }

  private notFound() {
    return new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'No encontramos ese proyecto.' })
  }
}

// Del formulario a las columnas: una descripción vacía es nula y la portada es "preset:<clave>".
function fieldsOf(input: ProjectInput): ProjectFields {
  return {
    name: input.name,
    kind: input.kind,
    status: input.status,
    description: input.description === '' ? null : input.description,
    coverPath: input.cover ? `${COVER_PREFIX}${input.cover}` : null,
    startedOn: input.startedOn,
    goalOn: input.goalOn,
  }
}

// El avance, el conteo de tareas y la próxima fecha NO van aquí: salen de las tareas y los arma el Next.js
// de en medio (decisión #38).
function toProject(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    description: row.description,
    coverPath: row.coverPath,
    startedOn: row.startedOn,
    goalOn: row.goalOn,
  }
}

function toObjective(row: ObjectiveRow) {
  return { id: row.id, text: row.text, done: row.done }
}

function toLink(row: LinkRow) {
  return { id: row.id, title: row.title, url: row.url }
}
