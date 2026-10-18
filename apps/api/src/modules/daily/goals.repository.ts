import { Inject, Injectable } from '@nestjs/common'
import type { GoalArea, GoalKind } from '@kairo/shared'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DB } from '../../common/db/db.module'
import { goalLogEntries, goalMilestones, goals } from '../../db/schema/daily'

type GoalFields = {
  title: string
  area: GoalArea
  kind: GoalKind
  target: number | null
  unit: string
  blockId: string | null
  projectId: string | null
  dueOn: string | null
  why: string
}

@Injectable()
export class GoalsRepository {
  // @Inject() explícito: mismo motivo que en tasks.repository.ts.
  constructor(@Inject(DB) private readonly db: PostgresJsDatabase) {}

  findAll(userId: string) {
    return this.db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), isNull(goals.deletedAt)))
      .orderBy(desc(goals.createdAt))
  }

  findOne(userId: string, id: string) {
    return this.db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .then((rows) => rows[0])
  }

  async create(userId: string, data: GoalFields & { status: 'active'; current: number }) {
    const [row] = await this.db.insert(goals).values({ userId, ...data }).returning()
    if (!row) throw new Error('No se pudo crear la meta.')
    return row
  }

  async update(userId: string, id: string, data: Partial<typeof goals.$inferInsert>) {
    const [row] = await this.db
      .update(goals)
      .set(data)
      .where(and(eq(goals.id, id), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .returning()
    return row
  }

  async softDelete(userId: string, id: string) {
    await this.db.update(goals).set({ deletedAt: new Date() }).where(and(eq(goals.id, id), eq(goals.userId, userId)))
  }

  async restore(userId: string, id: string) {
    await this.db.update(goals).set({ deletedAt: null }).where(and(eq(goals.id, id), eq(goals.userId, userId)))
  }

  findMilestones(userId: string, goalId: string) {
    return this.db
      .select()
      .from(goalMilestones)
      .where(and(eq(goalMilestones.goalId, goalId), eq(goalMilestones.userId, userId)))
      .orderBy(asc(goalMilestones.createdAt))
  }

  async addMilestone(userId: string, goalId: string, text: string) {
    const [row] = await this.db.insert(goalMilestones).values({ userId, goalId, text }).returning()
    if (!row) throw new Error('No se pudo agregar el hito.')
    return row
  }

  async toggleMilestone(userId: string, goalId: string, milestoneId: string) {
    const [current] = await this.db
      .select()
      .from(goalMilestones)
      .where(and(eq(goalMilestones.id, milestoneId), eq(goalMilestones.goalId, goalId), eq(goalMilestones.userId, userId)))
    if (!current) return undefined
    const [row] = await this.db
      .update(goalMilestones)
      .set({ done: !current.done })
      .where(eq(goalMilestones.id, milestoneId))
      .returning()
    return row
  }

  findLog(userId: string, goalId: string) {
    return this.db
      .select()
      .from(goalLogEntries)
      .where(and(eq(goalLogEntries.goalId, goalId), eq(goalLogEntries.userId, userId)))
      .orderBy(desc(goalLogEntries.createdAt))
  }

  async addLogEntry(userId: string, goalId: string, logDate: string, amount: number) {
    const [row] = await this.db.insert(goalLogEntries).values({ userId, goalId, logDate, amount }).returning()
    if (!row) throw new Error('No se pudo registrar el avance.')
    return row
  }
}
