'use server'

import { addGoalProgressSchema, goalSchema, milestoneSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api, ApiError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import { failure, type DailyActionResult } from './action-result'
import type { Goal } from './types'

// Las acciones de Metas. Misma idea que routine-actions.ts: se vuelve a validar lo que llega. El avance
// de una meta de hitos, de hábito o de proyecto no se manda desde la pantalla: se calcula al leer
// (api.ts), igual que antes.

function refresh() {
  revalidatePath('/dia-a-dia', 'layout')
  revalidatePath('/')
}

const FIELD_BY_CODE: Record<string, string> = {
  TARGET_REQUIRED: 'target',
  BLOCK_REQUIRED: 'blockId',
  PROJECT_REQUIRED: 'projectId',
  PROJECT_NOT_FOUND: 'projectId',
}

function apiFailure(error: unknown, fallback: string): DailyActionResult {
  if (error instanceof ApiError && FIELD_BY_CODE[error.code]) return { ok: false, errors: { [FIELD_BY_CODE[error.code]]: error.message } }
  return failure(error instanceof ApiError ? error.message : fallback)
}

// Crea una meta (goalId null) o edita una existente. Al editar el tipo no cambia: el avance que ya tiene
// no tendría sentido en otro tipo (la API lo ignora también).
export async function saveGoalAction(goalId: string | null, raw: unknown): Promise<DailyActionResult> {
  const parsed = goalSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    if (goalId === null) {
      const goal = await api.post<Goal>('/goals', parsed.data)
      refresh()
      return { ok: true, id: goal.id }
    }
    await api.patch(`/goals/${goalId}`, parsed.data)
    refresh()
    return { ok: true, id: goalId }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar la meta. Intenta de nuevo.')
  }
}

// Marca o desmarca un hito. Al marcar el último, la meta se da por lograda.
export async function toggleMilestoneAction(goalId: string, milestoneId: string): Promise<DailyActionResult> {
  try {
    const res = await api.post<{ achieved: boolean }>(`/goals/${goalId}/milestones/${milestoneId}/toggle`, {})
    refresh()
    return { ok: true, id: goalId, achieved: res.achieved }
  } catch (error) {
    return apiFailure(error, 'No se pudo marcar el hito.')
  }
}

export async function addMilestoneAction(goalId: string, raw: unknown): Promise<DailyActionResult> {
  const parsed = milestoneSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post(`/goals/${goalId}/milestones`, parsed.data)
    refresh()
    return { ok: true, id: goalId }
  } catch (error) {
    return apiFailure(error, 'No se pudo agregar el hito.')
  }
}

// "Registrar avance" de una meta de tipo Número.
export async function addGoalProgressAction(goalId: string, raw: unknown): Promise<DailyActionResult> {
  const parsed = addGoalProgressSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post(`/goals/${goalId}/progress`, parsed.data)
    refresh()
    return { ok: true, id: goalId }
  } catch (error) {
    return apiFailure(error, 'No se pudo registrar el avance.')
  }
}

// "La logré": la meta pasa a la vitrina de logradas.
export async function achieveGoalAction(goalId: string): Promise<DailyActionResult> {
  try {
    await api.post(`/goals/${goalId}/achieve`, {})
    refresh()
    return { ok: true, id: goalId, achieved: true }
  } catch (error) {
    return apiFailure(error, 'No se pudo marcar como lograda.')
  }
}

// Pausar una meta (su avance se guarda) o retomarla.
export async function setGoalPausedAction(goalId: string, paused: boolean): Promise<DailyActionResult> {
  try {
    await api.post(`/goals/${goalId}/pause`, { paused })
    refresh()
    return { ok: true, id: goalId }
  } catch (error) {
    return apiFailure(error, 'No se pudo actualizar la meta.')
  }
}

// Borra una meta con su avance. Va a la papelera: el aviso trae "Deshacer".
export async function deleteGoalAction(goalId: string): Promise<DailyActionResult> {
  try {
    const res = await api.delete<{ id: string; undoToken: string }>(`/goals/${goalId}`)
    refresh()
    return { ok: true, id: goalId, undoToken: res.undoToken }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar.')
  }
}
