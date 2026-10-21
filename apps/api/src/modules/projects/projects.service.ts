import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { classifyProjectFile, COVER_IMAGE_MAX_BYTES, type ProjectInput, type ProjectLinkInput, type SignCoverUploadInput } from '@kairo/shared'
import { z } from 'zod'
import { StorageService } from '../../common/storage/storage.service'
import type { projectLinks, projectObjectives, projects } from '../../db/schema/projects'
import { ProjectsRepository, type ProjectFields } from './projects.repository'

type ProjectRow = typeof projects.$inferSelect
type ObjectiveRow = typeof projectObjectives.$inferSelect
type LinkRow = typeof projectLinks.$inferSelect

// La portada ilustrada se guarda como "preset:<clave>" (el front dibuja esa ilustración); una imagen
// subida por la persona se guarda como "storage:<ruta>" (decisión #44) y la API la resuelve a una
// URL firmada (`coverUrl`) antes de responder, porque el bucket es privado.
const COVER_PREFIX = 'preset:'
const STORAGE_PREFIX = 'storage:'

const isUuid = (value: string) => z.uuid().safeParse(value).success

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(ProjectsRepository) private readonly repository: ProjectsRepository,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

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

  // El proyecto (con sus objetivos y enlaces) a la papelera. Solo es método, no hay ruta `DELETE /projects/:id`:
  // borrar un proyecto desde su pantalla llega con la Papelera (decisión #41). Escuela lo usa al borrar una materia,
  // después de mandar a la papelera lo suyo (tareas, eventos, sprints). false = ya estaba borrado.
  softDelete(userId: string, id: string): Promise<boolean> {
    return this.repository.softDeleteWithLists(userId, id)
  }

  // --- Lo propio -----------------------------------------------------------------------------------------

  async findAll(userId: string) {
    const rows = await this.repository.findAll(userId)
    return Promise.all(rows.map((row) => this.toProjectWithCover(row)))
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
    // Elegir una portada ilustrada desde el formulario reemplaza cualquier imagen subida antes (y
    // borra su archivo de Storage): la portada es una sola, y "Guardar cambios" manda sobre lo que
    // haya quedado del botón "Subir mi imagen".
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()
    const previousStoragePath = storagePathOf(current.coverPath)
    const project = await this.repository.updateWithLists(userId, id, fieldsOf(input), input.objectives, input.links)
    if (!project) throw this.notFound()
    if (previousStoragePath && previousStoragePath !== storagePathOf(project.coverPath)) {
      await this.storage.remove([previousStoragePath])
    }
    return this.detailOf(userId, project)
  }

  // --- Portada subida (decisión #44: "Subir mi imagen" de ProyectoEditar.dc.html) -------------------------

  // Paso 1: pide la URL firmada. Es inmediata (no espera a "Guardar cambios", igual que las notas y
  // la fecha meta): subir una imagen reemplaza la portada en el momento.
  async signCoverUpload(userId: string, id: string, input: SignCoverUploadInput) {
    const project = await this.repository.findOne(userId, id)
    if (!project) throw this.notFound()
    if (classifyProjectFile(input.name) !== 'image') {
      throw new BadRequestException({ code: 'FILE_TYPE_NOT_ALLOWED', message: 'Elige una imagen (PNG, JPG, WEBP o GIF).' })
    }
    if (input.sizeBytes > COVER_IMAGE_MAX_BYTES) {
      throw new BadRequestException({ code: 'FILE_TOO_LARGE', message: 'La imagen pesa más de lo permitido.' })
    }
    const path = this.storage.buildPath(userId, `projects/${id}/cover`, input.name)
    return this.storage.createSignedUploadUrl(path)
  }

  // Paso 2: ya se subió. Se vuelve a preguntar a Storage qué hay en esa ruta (nunca se confía en lo
  // que diga la petición) y la portada anterior subida (si había una) se borra de Storage.
  async confirmCoverUpload(userId: string, id: string, path: string) {
    const project = await this.repository.findOne(userId, id)
    if (!project) throw this.notFound()
    if (!path.startsWith(`${userId}/projects/${id}/cover/`)) throw this.notFound()

    await this.storage.confirmUpload(path)
    const previousStoragePath = storagePathOf(project.coverPath)
    const row = await this.repository.setCoverPath(userId, id, `${STORAGE_PREFIX}${path}`)
    if (!row) throw this.notFound()
    if (previousStoragePath) await this.storage.remove([previousStoragePath])
    return this.toProjectWithCover(row)
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
    const [objectives, links, base] = await Promise.all([
      this.repository.findObjectives(userId, project.id),
      this.repository.findLinks(userId, project.id),
      this.toProjectWithCover(project),
    ])
    return { ...base, notes: project.notes, objectives: objectives.map(toObjective), links: links.map(toLink) }
  }

  // El bucket es privado: una portada subida (`storage:<ruta>`) se resuelve a una URL firmada de
  // corta duración antes de responder. Una ilustrada no toca Storage (el front ya sabe dibujarla).
  private async toProjectWithCover(row: ProjectRow) {
    const storagePath = storagePathOf(row.coverPath)
    const coverUrl = storagePath ? await this.storage.createSignedDownloadUrl(storagePath, 600) : null
    return { ...toProject(row), coverUrl }
  }

  private notFound() {
    return new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'No encontramos ese proyecto.' })
  }
}

// La ruta de Storage detrás de una portada subida, o null si es ilustrada o no hay portada.
function storagePathOf(coverPath: string | null): string | null {
  return coverPath?.startsWith(STORAGE_PREFIX) ? coverPath.slice(STORAGE_PREFIX.length) : null
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
