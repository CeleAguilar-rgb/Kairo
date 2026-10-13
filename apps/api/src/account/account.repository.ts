import { Inject, Injectable } from '@nestjs/common'
import type { ModuleId } from '@kairo/shared'
import { asc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../common/db/db.module'
import { profiles } from '../db/schema/_shared'
import { userSections } from '../db/schema/account'

export type SectionRow = {
  section: ModuleId
  enabled: boolean
  position: number
}

@Injectable()
export class AccountRepository {
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  async findProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
    return profile
  }

  async findSections(userId: string) {
    return this.db
      .select()
      .from(userSections)
      .where(eq(userSections.userId, userId))
      .orderBy(asc(userSections.position))
  }

  // profiles.id no tiene default: lo pone la API al completar la bienvenida
  // (_shared.ts). Primera vez => insert; si ya existe (p. ej. reabre
  // Bienvenida) => update.
  async upsertProfile(
    userId: string,
    data: { name: string; avatarPath: string; onboardedAt: Date },
  ) {
    await this.db
      .insert(profiles)
      .values({ id: userId, ...data })
      .onConflictDoUpdate({ target: profiles.id, set: data })
  }

  async updateProfile(
    userId: string,
    data: { name: string; avatarPath: string },
  ) {
    await this.db.update(profiles).set(data).where(eq(profiles.id, userId))
  }

  // Reemplazo completo: la tabla es chica (una fila por módulo como máximo) y
  // tanto Bienvenida como "Mis secciones" siempre mandan la lista entera, no
  // cambios parciales. Transacción para no dejar al usuario sin filas a medias.
  async replaceSections(userId: string, rows: SectionRow[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(userSections).where(eq(userSections.userId, userId))
      if (rows.length > 0) {
        await tx
          .insert(userSections)
          .values(rows.map((row) => ({ userId, ...row })))
      }
    })
  }
}
