import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '../env'
import { SUPABASE_ADMIN } from '../supabase/supabase.module'

export type StoredObject = { sizeBytes: number; mime: string }

// Todo lo que sube la persona vive en un solo bucket privado, en "<user_id>/<módulo>/..."
// (docs/guides/security.md, sección 7). Subir y bajar son URLs firmadas que esta pieza prepara
// después de validar; quien las usa (el navegador) habla directo con Storage con ellas —
// la única excepción a "nunca directo" de docs/guides/architecture.md.
@Injectable()
export class StorageService {
  constructor(@Inject(SUPABASE_ADMIN) private readonly admin: SupabaseClient) {}

  private get bucket() {
    return this.admin.storage.from(env.SUPABASE_STORAGE_BUCKET)
  }

  // El nombre que eligió la persona nunca entra crudo a la ruta: con espacios, "/" o "../" rompería
  // la ruta o pisaría otro archivo. Guarda solo la extensión; el nombre real se guarda en la tabla.
  buildPath(userId: string, moduleFolder: string, filename: string): string {
    const dot = filename.lastIndexOf('.')
    const extension =
      dot > 0
        ? filename
            .slice(dot)
            .replace(/[^.\w]/g, '')
            .slice(0, 10)
        : ''
    return `${userId}/${moduleFolder}/${randomUUID()}${extension}`
  }

  async createSignedUploadUrl(
    path: string,
  ): Promise<{ path: string; token: string }> {
    const { data, error } = await this.bucket.createSignedUploadUrl(path)
    if (error || !data)
      throw new InternalServerErrorException({
        code: 'STORAGE_ERROR',
        message: 'No pudimos preparar la subida.',
      })
    return { path: data.path, token: data.token }
  }

  // Nunca se confía en lo que diga quien subió el archivo (nombre, tipo o tamaño): esto le vuelve a
  // preguntar a Storage qué hay de verdad en esa ruta antes de guardar nada en la base.
  async confirmUpload(path: string): Promise<StoredObject> {
    const { data, error } = await this.bucket.info(path)
    if (error || !data || typeof data.size !== 'number') {
      throw new BadRequestException({
        code: 'UPLOAD_NOT_FOUND',
        message: 'No encontramos ese archivo. Intenta subirlo otra vez.',
      })
    }
    return {
      sizeBytes: data.size,
      mime: data.contentType ?? 'application/octet-stream',
    }
  }

  async createSignedDownloadUrl(
    path: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const { data, error } = await this.bucket.createSignedUrl(
      path,
      expiresInSeconds,
    )
    if (error || !data)
      throw new InternalServerErrorException({
        code: 'STORAGE_ERROR',
        message: 'No pudimos preparar la descarga.',
      })
    return data.signedUrl
  }

  // "Mejor esfuerzo": si Storage falla al borrar, no vale la pena tumbar la petición completa por
  // un archivo que, como mucho, queda huérfano (lo limpiará el futuro job de la papelera).
  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return
    await this.bucket.remove(paths).catch(() => undefined)
  }
}
