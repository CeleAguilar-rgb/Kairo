'use server'

import { routineBlockSchema, routineSchema, toggleRoutineBlockSchema, type RoutineBlockInput } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api, ApiError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import { failure, type DailyActionResult } from './action-result'
import { getDayRoutine } from './api'
import type { RoutineBlock } from './types'

// Las acciones de la rutina (Hoy y el editor de rutinas). Una Server Action es un endpoint público: lo
// que llega NO se confía, se vuelve a validar con el mismo esquema del front (packages/shared), y ese
// esquema también es el contrato de POST/PATCH de la API: ahí se revalida otra vez.

function refresh() {
  revalidatePath('/dia-a-dia', 'layout')
  revalidatePath('/')
}

function apiFailure(error: unknown, fallback: string): DailyActionResult {
  if (error instanceof ApiError && error.code === 'FOCUS_LINK_REQUIRED') return { ok: false, errors: { link: error.message } }
  return failure(error instanceof ApiError ? error.message : fallback)
}

// Marca o desmarca un bloque de hoy. La hora de la marca y si fue "tarde" las decide la API con su
// reloj: la pantalla solo dice "hecho / no hecho", así nadie se marca "a tiempo" a mano.
export async function toggleRoutineBlockAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = toggleRoutineBlockSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post(`/routine-blocks/${parsed.data.blockId}/toggle`, { done: parsed.data.done })
    refresh()
    return { ok: true, id: parsed.data.blockId }
  } catch (error) {
    return apiFailure(error, 'No se pudo marcar el bloque.')
  }
}

// Hacer una tarea del bloque de enfoque en curso: avanza a la siguiente y el bloque queda marcado.
// Cuántas tareas hay en total sigue siendo de ejemplo (FOCUS_TASKS en mock.ts, decisión #39: Tareas no
// tiene el concepto de "área" para filtrar por ahí), así que ese límite se valida aquí, con lo que ya
// resuelve getDayRoutine, no en la API.
export async function completeFocusTaskAction(blockId: string): Promise<DailyActionResult> {
  const { focus } = await getDayRoutine()
  const info = focus[blockId]
  if (!info) return failure('No encontramos ese bloque.')
  if (info.doneCount >= info.tasks.length) return failure('No hay más tareas pendientes ahí.')

  try {
    await api.post(`/routine-blocks/${blockId}/complete-focus-task`, {})
    refresh()
    return { ok: true, id: blockId }
  } catch (error) {
    return apiFailure(error, 'No se pudo marcar la tarea.')
  }
}

// "Deshacer" de borrar un bloque, una rutina, un platillo, una entrada del diario o una meta: un solo
// endpoint para las 4 áreas (el token trae codificado qué restaurar — daily-undo.ts, en la API).
export async function undoRoutineAction(token: string): Promise<DailyActionResult> {
  try {
    await api.post('/daily/undo', { token })
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'Ya no se puede deshacer.')
  }
}

// --- Editor de rutinas ----------------------------------------------------------------------------

// Crea o edita un bloque. `blockId` null = bloque nuevo.
export async function saveBlockAction(routineId: string, blockId: string | null, raw: unknown): Promise<DailyActionResult> {
  const parsed = routineBlockSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    if (blockId === null) {
      const body: RoutineBlockInput & { routineId: string } = { ...parsed.data, routineId }
      const block = await api.post<RoutineBlock>('/routine-blocks', body)
      refresh()
      return { ok: true, id: block.id }
    }
    await api.patch(`/routine-blocks/${blockId}`, parsed.data)
    refresh()
    return { ok: true, id: blockId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar el bloque.')
  }
}

export async function deleteBlockAction(blockId: string): Promise<DailyActionResult> {
  try {
    const res = await api.delete<{ id: string; undoToken: string }>(`/routine-blocks/${blockId}`)
    refresh()
    return { ok: true, id: blockId, undoToken: res.undoToken }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar.')
  }
}

// Una rutina nueva, sin días ni bloques: se llena desde el editor.
export async function createRoutineAction(): Promise<DailyActionResult> {
  try {
    const routine = await api.post<{ id: string }>('/routines', {})
    refresh()
    return { ok: true, id: routine.id }
  } catch (error) {
    return apiFailure(error, 'No se pudo crear la rutina.')
  }
}

// Cambia el nombre, los días o si está activa.
export async function updateRoutineAction(routineId: string, raw: unknown): Promise<DailyActionResult> {
  const parsed = routineSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.patch(`/routines/${routineId}`, parsed.data)
    refresh()
    return { ok: true, id: routineId }
  } catch (error) {
    return apiFailure(error, 'No se pudo guardar la rutina.')
  }
}

// Borra una rutina con sus bloques. El historial del reporte se conserva (los registros no se tocan).
export async function deleteRoutineAction(routineId: string): Promise<DailyActionResult> {
  try {
    const res = await api.delete<{ id: string; undoToken: string }>(`/routines/${routineId}`)
    refresh()
    return { ok: true, id: routineId, undoToken: res.undoToken }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar.')
  }
}

// "Copiar de Entre semana": los bloques de una rutina pasan a otra.
export async function copyBlocksAction(fromId: string, toId: string): Promise<DailyActionResult> {
  try {
    await api.post('/routine-blocks/copy', { fromRoutineId: fromId, toRoutineId: toId })
    refresh()
    return { ok: true, id: toId }
  } catch (error) {
    return apiFailure(error, 'No se pudo copiar.')
  }
}

