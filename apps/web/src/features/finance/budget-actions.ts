'use server'

import { FALLBACK_CATEGORY_ID, budgetAlertsSchema, budgetLimitSchema, categorySchema, financeIdSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import { failure, type FinanceActionResult } from './action-result'
import { monthOf, spentByCategory, transactionsOfMonth } from './finance-utils'
import { loadFinance, rememberUndo } from './mock-store'
import type { Category } from './types'

// Las acciones de Presupuesto. El límite de una categoría es mensual y vale para todos los meses (así está en
// `categories.monthly_limit_cents`); lo gastado se calcula de los movimientos de cada mes.

function refresh() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/')
}

// Pone, cambia o quita (null) el límite mensual de una categoría de gasto.
export async function setBudgetLimitAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = budgetLimitSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadFinance()
  const category = world.categories.find((item) => item.id === parsed.data.categoryId)
  if (!category || category.kind !== 'expense') return failure('No encontramos esa categoría.')

  category.limitCents = parsed.data.limitCents
  refresh()
  return { ok: true, id: category.id }
}

// Agrega una categoría de gasto nueva, con $500 de límite para empezar (se cambia en su fila).
export async function addCategoryAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadFinance()
  const name = parsed.data.name
  if (world.categories.some((item) => item.kind === 'expense' && item.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, errors: { name: 'Ya tienes una categoría con ese nombre.' } }
  }

  const category: Category = { id: crypto.randomUUID(), name, kind: 'expense', color: parsed.data.color, icon: 'tag', limitCents: 50_000 }
  // Justo después de la última categoría de gasto, antes de las de ingreso.
  const lastExpense = world.categories.map((item) => item.kind).lastIndexOf('expense')
  world.categories.splice(lastExpense + 1, 0, category)
  refresh()
  return { ok: true, id: category.id }
}

// Borra una categoría de gasto: sus movimientos pasan a "Otros" (nada se pierde). "Otros" no se puede borrar.
// Va a la papelera: "Deshacer" devuelve la categoría y sus movimientos.
export async function deleteCategoryAction(categoryId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(categoryId).success || categoryId === FALLBACK_CATEGORY_ID) return failure('Esa categoría no se puede borrar.')

  await mockDelay()
  const { world } = await loadFinance()
  const index = world.categories.findIndex((item) => item.id === categoryId)
  const category = index === -1 ? null : world.categories[index]
  if (!category || category.kind !== 'expense') return failure('No encontramos esa categoría.')

  world.categories.splice(index, 1)
  const moved = world.transactions.filter((item) => item.categoryId === categoryId)
  for (const transaction of moved) transaction.categoryId = FALLBACK_CATEGORY_ID

  const undoToken = rememberUndo(world, () => {
    world.categories.splice(Math.min(index, world.categories.length), 0, category)
    for (const transaction of moved) transaction.categoryId = categoryId
  })
  refresh()
  return { ok: true, id: categoryId, undoToken }
}

// Los dos avisos del presupuesto: al llegar al 80% y al pasarse. (Los avisos de verdad llegan con los
// Recordatorios y las tareas programadas; aquí solo se guarda la preferencia.)
export async function setBudgetAlertsAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = budgetAlertsSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadFinance()
  world.budgetAlerts = parsed.data
  refresh()
  return { ok: true }
}

// "Usar lo real": el límite de cada categoría pasa a lo que se gastó este mes, redondeado hacia arriba a $50.
// Las categorías sin gasto conservan su límite. "Deshacer" devuelve los límites de antes.
export async function adoptActualBudgetAction(): Promise<FinanceActionResult> {
  await mockDelay()
  const { world, ctx } = await loadFinance()
  const spent = spentByCategory(transactionsOfMonth(world.transactions, monthOf(ctx.today)))

  const before = new Map(world.categories.map((category) => [category.id, category.limitCents]))
  let changed = 0
  for (const category of world.categories) {
    const amount = spent.get(category.id)
    if (category.kind !== 'expense' || !amount) continue
    category.limitCents = Math.ceil(amount / 5_000) * 5_000
    changed += 1
  }
  if (changed === 0) return failure('Todavía no hay gastos este mes para tomar de base.')

  const undoToken = rememberUndo(world, () => {
    for (const category of world.categories) {
      if (before.has(category.id)) category.limitCents = before.get(category.id) ?? null
    }
  })
  refresh()
  return { ok: true, undoToken }
}
