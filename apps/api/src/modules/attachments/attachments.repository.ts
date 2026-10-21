import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { attachments } from '../../db/schema/attachments'

export type AttachmentFields = {
  projectId: string
  name: string
  storagePath: string
  mime: string
  sizeBytes: number
}

@Injectable()
export class AttachmentsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findByProject(userId: string, projectId: string) {
    return this.db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.projectId, projectId),
          eq(attachments.userId, userId),
          isNull(attachments.deletedAt),
        ),
      )
      .orderBy(desc(attachments.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.id, id),
          eq(attachments.userId, userId),
          isNull(attachments.deletedAt),
        ),
      )
      .then((rows) => rows[0])
  }

  async create(userId: string, fields: AttachmentFields) {
    const [row] = await this.db
      .insert(attachments)
      .values({ userId, ...fields })
      .returning()
    if (!row) throw new Error('No se pudo guardar el archivo.')
    return row
  }

  // Lo que ya ocupa la persona en todo Storage (todos sus proyectos), para la cuota compartida.
  async totalBytes(userId: string): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<string>`coalesce(sum(${attachments.sizeBytes}), 0)`,
      })
      .from(attachments)
      .where(and(eq(attachments.userId, userId), isNull(attachments.deletedAt)))
    return Number(row?.total ?? 0)
  }

  async softDelete(userId: string, id: string) {
    const [row] = await this.db
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(attachments.id, id),
          eq(attachments.userId, userId),
          isNull(attachments.deletedAt),
        ),
      )
      .returning({ id: attachments.id })
    return row
  }

  // Los archivos de un proyecto se van a la papelera con él (lo usa Escuela al borrar una materia).
  async softDeleteByProject(userId: string, projectId: string): Promise<void> {
    await this.db
      .update(attachments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(attachments.projectId, projectId),
          eq(attachments.userId, userId),
          isNull(attachments.deletedAt),
        ),
      )
  }

  // El "Deshacer" del aviso de borrar (regla 11): solo quita `deletedAt`, sin tocar Storage, que
  // nunca llegó a perder el archivo.
  async restore(userId: string, id: string) {
    const [row] = await this.db
      .update(attachments)
      .set({ deletedAt: null })
      .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
      .returning()
    return row
  }
}
