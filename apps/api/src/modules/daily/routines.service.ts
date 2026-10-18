import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { RoutineBlockInput, RoutineInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import type { routineBlocks, routineLogs, routines } from '../../db/schema/daily'
import { isLateMark, minutesToWallTime, nowMinutesIn, routineAppliesOn, todayIn, toWallTime } from './daily-utils'
import { encodeDailyUndo } from './daily-undo'
import { RoutinesRepository } from './routines.repository'

type RoutineRow = typeof routines.$inferSelect
type BlockRow = typeof routineBlocks.$inferSelect
type LogRow = typeof routineLogs.$inferSelect

@Injectable()
export class RoutinesService {
  constructor(
    @Inject(RoutinesRepository) private readonly repository: RoutinesRepository,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  async findAll(userId: string) {
    const [routineRows, blockRows] = await Promise.all([this.repository.findRoutines(userId), this.repository.findBlocks(userId)])
    return { routines: routineRows.map(toRoutine), blocks: blockRows.map(toBlock) }
  }

  // Rango crudo de registros (reporte, rachas y el avance de una meta de hábito se calculan en el
  // Next.js de en medio con esto, igual que antes con los datos de ejemplo — decisión #37).
  async findLogs(userId: string, from: string, to: string) {
    const rows = await this.repository.findLogsInRange(userId, from, to)
    return rows.map(toLog)
  }

  async createRoutine(userId: string) {
    const existing = await this.repository.findRoutines(userId)
    const taken = new Set(existing.map((routine) => routine.name))
    let name = 'Rutina nueva'
    for (let n = 2; taken.has(name); n++) name = `Rutina nueva ${n}`
    const row = await this.repository.createRoutine(userId, { name, days: Array(7).fill(false), active: true })
    return toRoutine(row)
  }

  async updateRoutine(userId: string, id: string, input: RoutineInput) {
    const row = await this.repository.updateRoutine(userId, id, input)
    if (!row) throw this.notFoundRoutine()
    return toRoutine(row)
  }

  // Borra la rutina y sus bloques juntos; el historial del reporte no se toca (ver schema).
  async deleteRoutine(userId: string, id: string) {
    const current = await this.repository.findRoutine(userId, id)
    if (!current) throw this.notFoundRoutine()
    await this.repository.softDeleteRoutine(userId, id)
    return { id, undoToken: encodeDailyUndo({ type: 'routine', id }) }
  }

  async createBlock(userId: string, routineId: string, input: RoutineBlockInput) {
    if (input.kind === 'focus' && !input.link) {
      throw new BadRequestException({ code: 'FOCUS_LINK_REQUIRED', message: 'Elige de dónde sale la tarea.' })
    }
    const existing = await this.repository.findBlocksOfRoutine(userId, routineId)
    const row = await this.repository.createBlock(userId, {
      ...toBlockFields(input),
      routineId,
      position: existing.length,
      note: null,
    })
    return toBlock(row)
  }

  async updateBlock(userId: string, id: string, input: RoutineBlockInput) {
    if (input.kind === 'focus' && !input.link) {
      throw new BadRequestException({ code: 'FOCUS_LINK_REQUIRED', message: 'Elige de dónde sale la tarea.' })
    }
    const row = await this.repository.updateBlock(userId, id, toBlockFields(input))
    if (!row) throw this.notFoundBlock()
    return toBlock(row)
  }

  async deleteBlock(userId: string, id: string) {
    const current = await this.repository.findBlock(userId, id)
    if (!current) throw this.notFoundBlock()
    await this.repository.softDeleteBlock(userId, id)
    return { id, undoToken: encodeDailyUndo({ type: 'block', id }) }
  }

  async copyBlocks(userId: string, fromRoutineId: string, toRoutineId: string) {
    await this.repository.copyBlocks(userId, fromRoutineId, toRoutineId)
    const blocks = await this.repository.findBlocksOfRoutine(userId, toRoutineId)
    return blocks.map(toBlock)
  }

  // El servidor decide la hora de la marca y si fue tarde; la pantalla solo dice "hecho / no hecho".
  async toggleBlock(userId: string, blockId: string, done: boolean) {
    const block = await this.repository.findBlock(userId, blockId)
    if (!block) throw this.notFoundBlock()
    if (block.kind === 'free') throw this.notTodayError()

    const routine = await this.repository.findRoutine(userId, block.routineId)
    const timeZone = await this.timeZoneOf(userId)
    const today = todayIn(timeZone)
    if (!routine || !routineAppliesOn(routine, today)) throw this.notTodayError()

    if (!done) {
      await this.repository.clearLog(userId, blockId, today)
      return { blockId, log: null }
    }
    const nowMinutes = nowMinutesIn(timeZone)
    const doneAt = minutesToWallTime(nowMinutes)
    const late = isLateMark(block, nowMinutes)
    await this.repository.upsertLog(userId, blockId, today, doneAt, late)
    return { blockId, log: { doneAt, late } }
  }

  // Completar una tarea de enfoque también marca el bloque como hecho la primera vez (igual que hoy en
  // el front): cuántas tareas hay en total lo sabe el Next.js de en medio (siguen siendo de ejemplo,
  // FOCUS_TASKS — decisión #39), así que ese límite se valida ahí, no aquí.
  async completeFocusTask(userId: string, blockId: string) {
    const block = await this.repository.findBlock(userId, blockId)
    if (!block) throw this.notFoundBlock()
    if (block.kind !== 'focus') throw new BadRequestException({ code: 'NOT_FOCUS_BLOCK', message: 'Ese bloque no es de enfoque.' })

    const timeZone = await this.timeZoneOf(userId)
    const today = todayIn(timeZone)
    const nowMinutes = nowMinutesIn(timeZone)
    const row = await this.repository.incrementFocusDone(userId, blockId, today, minutesToWallTime(nowMinutes), isLateMark(block, nowMinutes))
    if (!row) throw new Error('No se pudo marcar la tarea.')
    return { blockId, focusDone: row.focusDone, log: { doneAt: toWallTime(row.doneAt), late: row.late } }
  }

  async restoreRoutine(userId: string, id: string) {
    await this.repository.restoreRoutine(userId, id)
  }

  async restoreBlock(userId: string, id: string) {
    await this.repository.restoreBlock(userId, id)
  }

  private async timeZoneOf(userId: string): Promise<string> {
    const { profile } = await this.accountService.getMe(userId)
    return profile.timezone
  }

  private notTodayError() {
    return new BadRequestException({ code: 'BLOCK_NOT_TODAY', message: 'Ese bloque no es de hoy.' })
  }

  private notFoundRoutine() {
    return new NotFoundException({ code: 'ROUTINE_NOT_FOUND', message: 'No encontramos esa rutina.' })
  }

  private notFoundBlock() {
    return new NotFoundException({ code: 'BLOCK_NOT_FOUND', message: 'No encontramos ese bloque.' })
  }
}

function toBlockFields(input: RoutineBlockInput) {
  return {
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    kind: input.kind,
    icon: input.icon,
    alert: input.alert,
    nagMinutes: input.nagMinutes,
    // Lo libre no se marca: nunca cuenta para el reporte aunque venga marcado del form.
    countsForReport: input.kind === 'free' ? false : input.countsForReport,
    link: input.kind === 'focus' ? input.link : null,
  }
}

function toRoutine(row: RoutineRow) {
  return { id: row.id, name: row.name, days: row.days, active: row.active }
}

function toBlock(row: BlockRow) {
  return {
    id: row.id,
    routineId: row.routineId,
    startsAt: toWallTime(row.startsAt),
    endsAt: row.endsAt ? toWallTime(row.endsAt) : null,
    title: row.title,
    kind: row.kind,
    icon: row.icon,
    position: row.position,
    alert: row.alert,
    nagMinutes: row.nagMinutes,
    countsForReport: row.countsForReport,
    link: row.link,
    note: row.note,
  }
}

function toLog(row: LogRow) {
  return { blockId: row.blockId, date: row.logDate, doneAt: toWallTime(row.doneAt), late: row.late, focusDone: row.focusDone }
}
