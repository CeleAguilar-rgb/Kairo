'use server'

import { budgetAlertsSchema, budgetLimitSchema, categorySchema, financeIdSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import { apiFailure } from './action-errors'
import { failure, type FinanceActionResult } from './action-result'
import type { Category } from './types'

// Las acciones de Presupuesto. El límite de una categoría es mensual y vale para todos los meses (así está en
// `categories.monthly_limit_cents`); lo gastado de cada mes se calcula de los movimientos.

function refresh() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/')
}

// Pone, cambia o quita (null) el límite mensual de una categoría de gasto.
export async function setBudgetLimitAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = budgetLimitSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const category = await api.post<Category>('/finance/budget/limit', parsed.data)
    refresh()
    return { ok: true, id: category.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar el límite. Intenta de nuevo.')
  }
}

// Agrega una categoría de gasto nueva, con $500 de límite para empezar (se cambia en su fila).
export async function addCategoryAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const category = await api.post<Category>('/finance/budget/categories', parsed.data)
    refresh()
    return { ok: true, id: category.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar la categoría. Intenta de nuevo.')
  }
}

// Borra una categoría de gasto: sus movimientos se cuentan en "Otros" (nada se pierde). "Otros" no se puede
// borrar (la API lo impide). Va a la papelera: "Deshacer" devuelve la categoría y, con ella, sus movimientos.
export async function deleteCategoryAction(categoryId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(categoryId).success) return failure('Esa categoría no se puede borrar.')

  try {
    const result = await api.delete<{ id: string; undoToken: string }>(`/finance/budget/categories/${categoryId}`)
    refresh()
    return { ok: true, id: categoryId, undoToken: result.undoToken }
  } catch (error) {
    return apiFailure(error, 'No pudimos borrar la categoría. Intenta de nuevo.')
  }
}

// Los dos avisos del presupuesto: al llegar al 80% y al pasarse. (Los avisos de verdad llegan con los
// Recordatorios y las tareas programadas; aquí solo se guarda la preferencia.)
export async function setBudgetAlertsAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = budgetAlertsSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    await api.post('/finance/budget/alerts', parsed.data)
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar los avisos. Intenta de nuevo.')
  }
}

// "Usar lo real": el límite de cada categoría pasa a lo que se gastó este mes, redondeado hacia arriba a $50.
// Las categorías sin gasto conservan su límite. "Deshacer" devuelve los límites de antes.
export async function adoptActualBudgetAction(): Promise<FinanceActionResult> {
  try {
    const result = await api.post<{ undoToken: string }>('/finance/budget/adopt-actual', {})
    refresh()
    return { ok: true, undoToken: result.undoToken }
  } catch (error) {
    return apiFailure(error, 'No pudimos tomar el gasto real de base. Intenta de nuevo.')
  }
}
