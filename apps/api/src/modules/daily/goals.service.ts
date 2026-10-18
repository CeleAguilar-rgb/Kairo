import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { GoalInput } from '@kairo/shared'
import { AccountService } from '../../account/account.service'
import type { goalLogEntries, goalMilestones, goals } from '../../db/schema/daily'
import { todayIn } from './daily-utils'
import { encodeDailyUndo } from './daily-undo'
import { GoalsRepository } from './goals.repository'

type GoalRow = typeof goals.$inferSelect
type MilestoneRow = typeof goalMilestones.$inferSelect
type LogRow = typeof goalLogEntries.$inferSelect

// Igual que HABIT_TARGET_PERCENT en features/daily/goal-utils.ts: una meta de hábito se da por cumplida
// al 90% de los días del mes, no al 100% (un mes con algún día perdido sigue contando como logrado).
const HABIT_TARGET_PERCENT = 90

@Injectable()
export class GoalsService {
  constructor(
    @Inject(GoalsRepository) private readonly repository: GoalsRepository,
    @Inject(AccountService) private readonly accountService: AccountService,
  ) {}

  async findAll(userId: string) {
    const rows = await this.repository.findAll(userId)
    return Promise.all(rows.map((row) => this.toGoal(userId, row)))
  }

  // target/current/unit por kind: para 'milestones'/'project'/'habit' el Next.js de en medio los
  // recalcula siempre al leer (deriveGoal, decisión #37 aplicada aquí): lo que se guarda aquí para esos
  // tres tipos no se usa, salvo 'milestones' (sus hitos sí son la fuente real).
  async create(userId: string, input: GoalInput) {
    if (input.kind === 'number' && input.target === null) {
      throw new BadRequestException({ code: 'TARGET_REQUIRED', message: 'Escribe la cantidad que quieres alcanzar.' })
    }
    if (input.kind === 'habit' && !input.blockId) {
      throw new BadRequestException({ code: 'BLOCK_REQUIRED', message: 'Elige el bloque de tu rutina.' })
    }
    if (input.kind === 'project' && !input.projectId) {
      throw new BadRequestException({ code: 'PROJECT_REQUIRED', message: 'Elige el proyecto.' })
    }

    const target = input.kind === 'number' ? input.target : input.kind === 'habit' ? HABIT_TARGET_PERCENT : input.kind === 'project' ? 100 : 0
    const row = await this.repository.create(userId, {
      title: input.title,
      area: input.area,
      kind: input.kind,
      status: 'active',
      target,
      current: 0,
      unit: input.kind === 'number' ? input.unit : '',
      blockId: input.kind === 'habit' ? input.blockId : null,
      projectId: input.kind === 'project' ? input.projectId : null,
      dueOn: input.dueOn,
      why: input.why,
    })
    return this.toGoal(userId, row)
  }

  // El tipo de una meta no se puede cambiar al editar: se ignora el kind del input, igual que hoy en el
  // front (saveGoalAction).
  async update(userId: string, id: string, input: GoalInput) {
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()

    const row = await this.repository.update(userId, id, {
      title: input.title,
      area: input.area,
      dueOn: input.dueOn,
      why: input.why,
      ...(current.kind === 'number' ? { target: input.target, unit: input.unit } : {}),
      ...(current.kind === 'habit' ? { blockId: input.blockId } : {}),
      ...(current.kind === 'project' ? { projectId: input.projectId } : {}),
    })
    if (!row) throw this.notFound()
    return this.toGoal(userId, row)
  }

  async delete(userId: string, id: string) {
    const current = await this.repository.findOne(userId, id)
    if (!current) throw this.notFound()
    await this.repository.softDelete(userId, id)
    return { id, undoToken: encodeDailyUndo({ type: 'goal', id }) }
  }

  async addMilestone(userId: string, goalId: string, text: string) {
    const current = await this.repository.findOne(userId, goalId)
    if (!current) throw this.notFound()
    if (current.kind !== 'milestones') throw this.notMilestones()
    await this.repository.addMilestone(userId, goalId, text)
    return this.toGoal(userId, current)
  }

  // Si quedan todos los hitos hechos, la meta se marca lograda sola.
  async toggleMilestone(userId: string, goalId: string, milestoneId: string) {
    const current = await this.repository.findOne(userId, goalId)
    if (!current) throw this.notFound()
    if (current.kind !== 'milestones' || current.status === 'done') throw this.notMilestones()

    const updated = await this.repository.toggleMilestone(userId, goalId, milestoneId)
    if (!updated) throw new NotFoundException({ code: 'MILESTONE_NOT_FOUND', message: 'No encontramos ese hito.' })

    const milestones = await this.repository.findMilestones(userId, goalId)
    const achieved = milestones.length > 0 && milestones.every((milestone) => milestone.done)
    if (!achieved) return { goal: await this.toGoal(userId, current), achieved: false }

    const today = await this.todayOf(userId)
    const row = await this.repository.update(userId, goalId, { status: 'done', achievedOn: today })
    return { goal: await this.toGoal(userId, row ?? current), achieved: true }
  }

  async addProgress(userId: string, goalId: string, amount: number) {
    const current = await this.repository.findOne(userId, goalId)
    if (!current) throw this.notFound()
    if (current.kind !== 'number') {
      throw new BadRequestException({ code: 'NOT_NUMBER_GOAL', message: 'Esa meta no es de tipo Número.' })
    }
    const today = await this.todayOf(userId)
    await this.repository.addLogEntry(userId, goalId, today, amount)
    const row = await this.repository.update(userId, goalId, { current: current.current + amount })
    return this.toGoal(userId, row ?? current)
  }

  // Funciona con cualquier kind, sin exigir que el avance haya llegado al target (igual que hoy).
  async achieve(userId: string, goalId: string) {
    const current = await this.repository.findOne(userId, goalId)
    if (!current) throw this.notFound()
    if (current.status === 'done') throw this.notFound()
    const today = await this.todayOf(userId)
    const row = await this.repository.update(userId, goalId, { status: 'done', achievedOn: today })
    return { goal: await this.toGoal(userId, row ?? current), achieved: true }
  }

  async setPaused(userId: string, goalId: string, paused: boolean) {
    const current = await this.repository.findOne(userId, goalId)
    if (!current) throw this.notFound()
    if (current.status === 'done') {
      throw new BadRequestException({ code: 'GOAL_ALREADY_DONE', message: 'Esa meta ya está lograda.' })
    }
    const row = await this.repository.update(userId, goalId, { status: paused ? 'paused' : 'active' })
    return this.toGoal(userId, row ?? current)
  }

  async restore(userId: string, id: string) {
    await this.repository.restore(userId, id)
  }

  private async todayOf(userId: string): Promise<string> {
    const { profile } = await this.accountService.getMe(userId)
    return todayIn(profile.timezone)
  }

  private async toGoal(userId: string, row: GoalRow) {
    const [milestones, log] = await Promise.all([
      row.kind === 'milestones' ? this.repository.findMilestones(userId, row.id) : Promise.resolve<MilestoneRow[]>([]),
      row.kind === 'number' ? this.repository.findLog(userId, row.id) : Promise.resolve<LogRow[]>([]),
    ])
    return {
      id: row.id,
      title: row.title,
      area: row.area,
      kind: row.kind,
      status: row.status,
      target: row.target,
      current: row.current,
      unit: row.unit,
      dueOn: row.dueOn,
      why: row.why,
      blockId: row.blockId,
      projectId: row.projectId,
      // linkLabel/linkHref siempre null: para 'project' y 'habit' los vuelve a calcular el Next.js de en
      // medio (deriveGoal) con datos de otro módulo que la API todavía no tiene (decisión #37/#39).
      linkLabel: null,
      linkHref: null,
      achievedOn: row.achievedOn,
      milestones: milestones.map(toMilestone),
      log: log.map(toLogEntry),
    }
  }

  private notFound() {
    return new NotFoundException({ code: 'GOAL_NOT_FOUND', message: 'No encontramos esa meta.' })
  }

  private notMilestones() {
    return new BadRequestException({ code: 'NOT_MILESTONES_GOAL', message: 'Esa meta no es de tipo Logro.' })
  }
}

function toMilestone(row: MilestoneRow) {
  return { id: row.id, text: row.text, done: row.done }
}

function toLogEntry(row: LogRow) {
  return { id: row.id, date: row.logDate, amount: row.amount }
}
