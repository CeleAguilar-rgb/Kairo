import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  classifyProjectFile,
  PROJECT_FILE_MAX_BYTES,
  STORAGE_QUOTA_BYTES,
  type SignAttachmentUploadInput,
} from '@kairo/shared'
import { StorageService } from '../../common/storage/storage.service'
import type { attachments } from '../../db/schema/attachments'
import { ProjectsService } from '../projects/projects.service'
import { AttachmentsRepository } from './attachments.repository'

type AttachmentRow = typeof attachments.$inferSelect

@Injectable()
export class AttachmentsService {
  constructor(
    @Inject(AttachmentsRepository)
    private readonly repository: AttachmentsRepository,
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  // Los archivos del proyecto más lo que ocupan los de los demás (el espacio es uno solo, lo pinta
  // la barra "Espacio" de la pestaña): total de la persona menos lo que pesan estos mismos archivos.
  async list(userId: string, projectId: string) {
    if (!(await this.projectsService.exists(userId, projectId)))
      throw this.projectNotFound()
    const [rows, totalBytes] = await Promise.all([
      this.repository.findByProject(userId, projectId),
      this.repository.totalBytes(userId),
    ])
    const files = rows.map(toAttachment)
    const usedByFiles = files.reduce((sum, file) => sum + file.sizeBytes, 0)
    return {
      files,
      usedElsewhereBytes: totalBytes - usedByFiles,
      quotaBytes: STORAGE_QUOTA_BYTES,
    }
  }

  // Paso 1: pide la URL firmada. Rechaza antes de firmar lo que ya se sabe que no va a pasar (tipo,
  // tamaño declarado, cuota con lo que ya ocupa); el paso 2 vuelve a revisar con el tamaño real.
  async signUpload(
    userId: string,
    projectId: string,
    input: SignAttachmentUploadInput,
  ) {
    if (!(await this.projectsService.exists(userId, projectId)))
      throw this.projectNotFound()
    if (!classifyProjectFile(input.name)) {
      throw new BadRequestException({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: 'Ese tipo de archivo no está permitido.',
      })
    }
    if (input.sizeBytes > PROJECT_FILE_MAX_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: 'El archivo pesa más de lo permitido.',
      })
    }
    const used = await this.repository.totalBytes(userId)
    if (used + input.sizeBytes > STORAGE_QUOTA_BYTES) {
      throw new BadRequestException({
        code: 'QUOTA_EXCEEDED',
        message: 'No tienes espacio suficiente.',
      })
    }
    const path = this.storage.buildPath(
      userId,
      `projects/${projectId}`,
      input.name,
    )
    return this.storage.createSignedUploadUrl(path)
  }

  // Paso 2: ya se subió. Nunca se confía en lo que diga la petición sobre el archivo: se vuelve a
  // preguntar a Storage qué hay de verdad en esa ruta antes de crear la fila.
  async confirmUpload(
    userId: string,
    projectId: string,
    path: string,
    name: string,
  ) {
    if (!(await this.projectsService.exists(userId, projectId)))
      throw this.projectNotFound()
    // La ruta la construyó signUpload con este mismo prefijo; una que no lo tenga no es de este
    // proyecto (o no es de esta persona), aunque sea una ruta real de Storage.
    if (!path.startsWith(`${userId}/projects/${projectId}/`))
      throw this.projectNotFound()

    const object = await this.storage.confirmUpload(path)
    const used = await this.repository.totalBytes(userId)
    if (used + object.sizeBytes > STORAGE_QUOTA_BYTES) {
      await this.storage.remove([path])
      throw new BadRequestException({
        code: 'QUOTA_EXCEEDED',
        message: 'No tienes espacio suficiente.',
      })
    }

    const row = await this.repository.create(userId, {
      projectId,
      name,
      storagePath: path,
      mime: object.mime,
      sizeBytes: object.sizeBytes,
    })
    return toAttachment(row)
  }

  async downloadUrl(userId: string, projectId: string, id: string) {
    if (!(await this.projectsService.exists(userId, projectId)))
      throw this.projectNotFound()
    const row = await this.repository.findOne(userId, id)
    if (!row) throw this.notFound()
    const url = await this.storage.createSignedDownloadUrl(row.storagePath)
    return { url }
  }

  async remove(userId: string, projectId: string, id: string) {
    if (!(await this.projectsService.exists(userId, projectId)))
      throw this.projectNotFound()
    const row = await this.repository.softDelete(userId, id)
    if (!row) throw this.notFound()
    return { id: row.id }
  }

  // API pública para Escuela: los archivos de un proyecto se van a la papelera con él. No falla si no tiene.
  async deleteByProject(userId: string, projectId: string): Promise<void> {
    await this.repository.softDeleteByProject(userId, projectId)
  }

  async restore(userId: string, projectId: string, id: string) {
    if (!(await this.projectsService.exists(userId, projectId)))
      throw this.projectNotFound()
    const row = await this.repository.restore(userId, id)
    if (!row) throw this.notFound()
    return toAttachment(row)
  }

  private notFound() {
    return new NotFoundException({
      code: 'ATTACHMENT_NOT_FOUND',
      message: 'No encontramos ese archivo.',
    })
  }

  private projectNotFound() {
    return new NotFoundException({
      code: 'PROJECT_NOT_FOUND',
      message: 'No encontramos ese proyecto.',
    })
  }
}

function toAttachment(row: AttachmentRow) {
  return {
    id: row.id,
    name: row.name,
    kind: classifyProjectFile(row.name),
    sizeBytes: row.sizeBytes,
    uploadedOn: row.createdAt.toISOString().slice(0, 10),
  }
}
