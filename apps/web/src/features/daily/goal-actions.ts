'use server'

import { addGoalProgressSchema, goalSchema, idSchema, milestoneSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import { failure, type DailyActionResult } from './action-result'
import { HABIT_TARGET_PERCENT } from './goal-utils'
import { loadWorld, rememberUndo } from './mock-store'
import type { Goal } from './types'

// Las acciones de Metas. Misma idea que routine-actions.ts: se vuelve a validar lo que llega. El avance de
// una meta de hitos, de hábito o de proyecto no se manda desde la pantalla: se calcula al leer (api.ts).

function refresh() {
  revalidatePath('/dia-a-dia', 'layout')
  revalidatePath('/')
}

function findGoal(goals: Goal[], goalId: string) {
  const index = goals.findIndex((goal) => goal.id === goalId)
  return { index, goal: index >= 0 ? goals[index] : null }
}

// Crea una meta (goalId null) o edita una existente. Al editar el tipo no cambia: el avance que ya tiene
// no tendría sentido en otro tipo.
export async function saveGoalAction(goalId: string | null, raw: unknown): Promise<DailyActionResult> {
  if (goalId !== null && !idSchema.safeParse(goalId).success) return failure('No encontramos esa meta.')
  const parsed = goalSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadWorld()
  const input = parsed.data

  if (goalId === null) {
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: input.title,
      area: input.area,
      kind: input.kind,
      status: 'active',
      target: input.kind === 'number' ? (input.target ?? 0) : input.kind === 'habit' ? HABIT_TARGET_PERCENT : input.kind === 'project' ? 100 : 0,
      current: 0,
      unit: input.kind === 'number' ? input.unit : '',
      dueOn: input.dueOn,
      why: input.why,
      blockId: input.kind === 'habit' ? input.blockId : null,
      projectId: input.kind === 'project' ? input.projectId : null,
      linkLabel: null,
      linkHref: null,
      achievedOn: null,
      milestones: [],
      log: [],
    }
    world.goals.unshift(goal)
    refresh()
    return { ok: true, id: goal.id }
  }

  const { index, goal } = findGoal(world.goals, goalId)
  if (!goal) return failure('No encontramos esa meta.')
  world.goals[index] = {
    ...goal,
    title: input.title,
    area: input.area,
    target: goal.kind === 'number' ? (input.target ?? goal.target) : goal.target,
    unit: goal.kind === 'number' ? input.unit : goal.unit,
    dueOn: input.dueOn,
    why: input.why,
    blockId: goal.kind === 'habit' ? input.blockId : goal.blockId,
    projectId: goal.kind === 'project' ? input.projectId : goal.projectId,
  }
  refresh()
  return { ok: true, id: goalId }
}

// Marca o desmarca un hito. Al marcar el último, la meta se da por lograda.
export async function toggleMilestoneAction(goalId: string, milestoneId: string): Promise<DailyActionResult> {
  if (!idSchema.safeParse(goalId).success || !idSchema.safeParse(milestoneId).success) return failure('No encontramos esa meta.')

  await mockDelay()
  const { world, ctx } = await loadWorld()
  const { index, goal } = findGoal(world.goals, goalId)
  if (!goal || goal.kind !== 'milestones' || goal.status === 'done') return failure('No encontramos esa meta.')

  const milestones = goal.milestones.map((milestone) => (milestone.id === milestoneId ? { ...milestone, done: !milestone.done } : milestone))
  const achieved = milestones.length > 0 && milestones.every((milestone) => milestone.done)
  world.goals[index] = { ...goal, milestones, ...(achieved ? { status: 'done' as const, achievedOn: ctx.today } : {}) }
  refresh()
  return { ok: true, id: goalId, achieved }
}

export async function addMilestoneAction(goalId: string, raw: unknown): Promise<DailyActionResult> {
  if (!idSchema.safeParse(goalId).success) return failure('No encontramos esa meta.')
  const parsed = milestoneSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadWorld()
  const { index, goal } = findGoal(world.goals, goalId)
  if (!goal || goal.kind !== 'milestones') return failure('No encontramos esa meta.')

  world.goals[index] = { ...goal, milestones: [...goal.milestones, { id: crypto.randomUUID(), text: parsed.data.text, done: false }] }
  refresh()
  return { ok: true, id: goalId }
}

// "Registrar avance" de una meta de tipo Número.
export async function addGoalProgressAction(goalId: string, raw: unknown): Promise<DailyActionResult> {
  if (!idSchema.safeParse(goalId).success) return failure('No encontramos esa meta.')
  const parsed = addGoalProgressSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world, ctx } = await loadWorld()
  const { index, goal } = findGoal(world.goals, goalId)
  if (!goal || goal.kind !== 'number') return failure('No encontramos esa meta.')

  const entry = { id: crypto.randomUUID(), date: ctx.today, amount: parsed.data.amount }
  world.goals[index] = { ...goal, current: goal.current + parsed.data.amount, log: [entry, ...goal.log] }
  refresh()
  return { ok: true, id: goalId }
}

// "La logré": la meta pasa a la vitrina de logradas.
export async function achieveGoalAction(goalId: string): Promise<DailyActionResult> {
  if (!idSchema.safeParse(goalId).success) return failure('No encontramos esa meta.')

  await mockDelay()
  const { world, ctx } = await loadWorld()
  const { index, goal } = findGoal(world.goals, goalId)
  if (!goal || goal.status === 'done') return failure('No encontramos esa meta.')

  world.goals[index] = { ...goal, status: 'done', achievedOn: ctx.today }
  refresh()
  return { ok: true, id: goalId, achieved: true }
}

// Pausar una meta (su avance se guarda) o retomarla.
export async function setGoalPausedAction(goalId: string, paused: boolean): Promise<DailyActionResult> {
  if (!idSchema.safeParse(goalId).success) return failure('No encontramos esa meta.')

  await mockDelay()
  const { world } = await loadWorld()
  const { index, goal } = findGoal(world.goals, goalId)
  if (!goal || goal.status === 'done') return failure('No encontramos esa meta.')

  world.goals[index] = { ...goal, status: paused ? 'paused' : 'active' }
  refresh()
  return { ok: true, id: goalId }
}

// Borra una meta con su avance. Va a la papelera: el aviso trae "Deshacer".
export async function deleteGoalAction(goalId: string): Promise<DailyActionResult> {
  if (!idSchema.safeParse(goalId).success) return failure('No encontramos esa meta.')

  await mockDelay()
  const { world } = await loadWorld()
  const { index, goal } = findGoal(world.goals, goalId)
  if (!goal) return failure('No encontramos esa meta.')

  world.goals.splice(index, 1)
  const undoToken = rememberUndo(world, () => world.goals.splice(index, 0, goal))
  refresh()
  return { ok: true, id: goalId, undoToken }
}
