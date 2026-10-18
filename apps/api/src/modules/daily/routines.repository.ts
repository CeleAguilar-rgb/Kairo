import { Inject, Injectable } from '@nestjs/common'
import type { RoutineIcon, RoutineKind } from '@kairo/shared'
import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { routineBlocks, routineLogs, routines } from '../../db/schema/daily'

type NewRoutine = { name: string; days: boolean[]; active: boolean }
type NewBlock = {
  routineId: string
  startsAt: string
  endsAt: string | null
  title: string
  kind: RoutineKind
  icon: RoutineIcon
  alert: boolean
  nagMinutes: number
  countsForReport: boolean
  link: string | null
}

@Injectable()
export class RoutinesRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findRoutines(userId: string) {
    return this.db
      .select()
      .from(routines)
      .where(and(eq(routines.userId, userId), isNull(routines.deletedAt)))
      .orderBy(asc(routines.createdAt))
  }

  findRoutine(userId: string, id: string) {
    return this.db
      .select()
      .from(routines)
      .where(and(eq(routines.id, id), eq(routines.userId, userId), isNull(routines.deletedAt)))
      .then((rows) => rows[0])
  }

  findBlocks(userId: string) {
    return this.db
      .select()
      .from(routineBlocks)
      .where(and(eq(routineBlocks.userId, userId), isNull(routineBlocks.deletedAt)))
      .orderBy(asc(routineBlocks.startsAt), asc(routineBlocks.position))
  }

  findBlocksOfRoutine(userId: string, routineId: string) {
    return this.db
      .select()
      .from(routineBlocks)
      .where(and(eq(routineBlocks.routineId, routineId), eq(routineBlocks.userId, userId), isNull(routineBlocks.deletedAt)))
      .orderBy(asc(routineBlocks.position))
  }

  findBlock(userId: string, id: string) {
    return this.db
      .select()
      .from(routineBlocks)
      .where(and(eq(routineBlocks.id, id), eq(routineBlocks.userId, userId), isNull(routineBlocks.deletedAt)))
      .then((rows) => rows[0])
  }

  async createRoutine(userId: string, data: NewRoutine) {
    const [row] = await this.db.insert(routines).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear la rutina.')
    return row
  }

  async updateRoutine(userId: string, id: string, data: Partial<NewRoutine>) {
    const [row] = await this.db
      .update(routines)
      .set(data)
      .where(and(eq(routines.id, id), eq(routines.userId, userId), isNull(routines.deletedAt)))
      .returning()
    return row
  }

  // Borra la rutina y sus bloques juntos: el historial del reporte (routine_logs) no se toca.
  async softDeleteRoutine(userId: string, id: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(routineBlocks)
        .set({ deletedAt: new Date() })
        .where(and(eq(routineBlocks.routineId, id), eq(routineBlocks.userId, userId), isNull(routineBlocks.deletedAt)))
      await tx.update(routines).set({ deletedAt: new Date() }).where(and(eq(routines.id, id), eq(routines.userId, userId)))
    })
  }

  async restoreRoutine(userId: string, id: string) {
    await this.db.transaction(async (tx) => {
      await tx.update(routines).set({ deletedAt: null }).where(and(eq(routines.id, id), eq(routines.userId, userId)))
      await tx
        .update(routineBlocks)
        .set({ deletedAt: null })
        .where(and(eq(routineBlocks.routineId, id), eq(routineBlocks.userId, userId)))
    })
  }

  async createBlock(userId: string, data: NewBlock & { position: number; note: string | null }) {
    const [row] = await this.db.insert(routineBlocks).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear el bloque.')
    return row
  }

  async updateBlock(userId: string, id: string, data: Partial<NewBlock>) {
    const [row] = await this.db
      .update(routineBlocks)
      .set(data)
      .where(and(eq(routineBlocks.id, id), eq(routineBlocks.userId, userId), isNull(routineBlocks.deletedAt)))
      .returning()
    return row
  }

  async softDeleteBlock(userId: string, id: string) {
    await this.db
      .update(routineBlocks)
      .set({ deletedAt: new Date() })
      .where(and(eq(routineBlocks.id, id), eq(routineBlocks.userId, userId)))
  }

  async restoreBlock(userId: string, id: string) {
    await this.db.update(routineBlocks).set({ deletedAt: null }).where(and(eq(routineBlocks.id, id), eq(routineBlocks.userId, userId)))
  }

  // "Copiar de": agrega los bloques de una rutina a otra al final, sin tocar los que ya tenía.
  async copyBlocks(userId: string, fromRoutineId: string, toRoutineId: string) {
    const [source, existing] = await Promise.all([
      this.findBlocksOfRoutine(userId, fromRoutineId),
      this.findBlocksOfRoutine(userId, toRoutineId),
    ])
    let position = existing.length
    for (const block of source) {
      await this.db.insert(routineBlocks).values({
        userId,
        routineId: toRoutineId,
        startsAt: block.startsAt,
        endsAt: block.endsAt,
        title: block.title,
        kind: block.kind,
        icon: block.icon,
        position: position++,
        alert: block.alert,
        nagMinutes: block.nagMinutes,
        countsForReport: block.countsForReport,
        link: block.link,
        note: block.note,
      })
    }
  }

  findLog(userId: string, blockId: string, logDate: string) {
    return this.db
      .select()
      .from(routineLogs)
      .where(and(eq(routineLogs.blockId, blockId), eq(routineLogs.userId, userId), eq(routineLogs.logDate, logDate)))
      .then((rows) => rows[0])
  }

  async upsertLog(userId: string, blockId: string, logDate: string, doneAt: string, late: boolean) {
    const current = await this.findLog(userId, blockId, logDate)
    if (current) {
      const [row] = await this.db
        .update(routineLogs)
        .set({ doneAt, late })
        .where(eq(routineLogs.id, current.id))
        .returning()
      return row
    }
    const [row] = await this.db.insert(routineLogs).values({ userId, blockId, logDate, doneAt, late }).returning()
    return row
  }

  async clearLog(userId: string, blockId: string, logDate: string) {
    await this.db
      .delete(routineLogs)
      .where(and(eq(routineLogs.blockId, blockId), eq(routineLogs.userId, userId), eq(routineLogs.logDate, logDate)))
  }

  async incrementFocusDone(userId: string, blockId: string, logDate: string, doneAt: string, late: boolean) {
    const current = await this.findLog(userId, blockId, logDate)
    if (current) {
      const [row] = await this.db
        .update(routineLogs)
        .set({ focusDone: current.focusDone + 1 })
        .where(eq(routineLogs.id, current.id))
        .returning()
      return row
    }
    const [row] = await this.db
      .insert(routineLogs)
      .values({ userId, blockId, logDate, doneAt, late, focusDone: 1 })
      .returning()
    return row
  }

  findLogsInRange(userId: string, from: string, to: string) {
    return this.db
      .select()
      .from(routineLogs)
      .where(and(eq(routineLogs.userId, userId), gte(routineLogs.logDate, from), lte(routineLogs.logDate, to)))
  }
}
