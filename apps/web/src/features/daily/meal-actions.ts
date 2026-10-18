'use server'

import { copyWeekSchema, mealRefSchema, mealSlotSchema, weekSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api, ApiError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import { failure, type DailyActionResult } from './action-result'

// Las acciones del Menú semanal. Misma idea que routine-actions.ts: se vuelve a validar todo lo que
// llega, y el mismo esquema es el contrato de la API.

function refresh() {
  revalidatePath('/dia-a-dia', 'layout')
  revalidatePath('/')
}

function apiFailure(error: unknown, fallback: string): DailyActionResult {
  return failure(error instanceof ApiError ? error.message : fallback)
}

// Guarda un platillo. Sin platillo, el espacio se vacía (así lo hace el canvas al guardar con el campo en blanco).
export async function saveMealAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = mealSlotSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.patch('/meal-plans', parsed.data)
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar el platillo.')
  }
}

export async function removeMealAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = mealRefSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post('/meal-plans/remove', parsed.data)
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'No se pudo quitar.')
  }
}

// "Repetir de lunes a viernes": el mismo platillo (y si es meal prep) en la misma comida de la semana.
export async function repeatMealWeekdaysAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = mealSlotSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post('/meal-plans/repeat-weekdays', parsed.data)
    refresh()
    return { ok: true }
  } catch (error) {
    if (error instanceof ApiError && error.code === 'DISH_REQUIRED') return { ok: false, errors: { dish: error.message } }
    return apiFailure(error, 'No se pudo repetir.')
  }
}

// Marcar una comida de hoy como comida (la tarjeta "Menú de hoy" de Inicio).
export async function toggleMealDoneAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = mealRefSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post('/meal-plans/toggle-done', parsed.data)
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'No se pudo marcar como comida.')
  }
}

// "Copiar la semana pasada": los platillos y si son meal prep pasan a la semana nueva; las notas no.
export async function copyWeekAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = copyWeekSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post('/meal-plans/copy-week', parsed.data)
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'No se pudo copiar la semana.')
  }
}

// "Vaciar semana": quita todos los platillos. Van a la papelera, así que se puede deshacer.
export async function clearWeekAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = weekSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const res = await api.post<{ ids: string[]; undoToken: string }>('/meal-plans/clear-week', parsed.data)
    refresh()
    return { ok: true, undoToken: res.undoToken }
  } catch (error) {
    return apiFailure(error, 'No se pudo vaciar la semana.')
  }
}
