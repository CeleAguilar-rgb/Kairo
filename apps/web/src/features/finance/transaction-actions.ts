'use server'

import { FINANCE_CURRENCY, financeIdSchema, transactionSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'
import { formatMoney } from '@/lib/money'

import { failure, type FinanceActionResult } from './action-result'
import { paidOf, savedOf } from './finance-utils'
import { insertTransaction, loadFinance, rememberUndo, runUndo, type FinanceWorld } from './mock-store'
import type { Transaction } from './types'

// Las acciones de Movimientos. Una Server Action es un endpoint público: lo que llega NO se confía, se vuelve a
// validar con el mismo esquema del front (packages/shared). Con la API, en vez de tocar el almacén de ejemplo
// llaman a `api.post('/finance/transactions', …)` y compañía; el userId lo pone la API con el token (regla 2)
// y toda consulta filtra por él (regla 3). Los ids no se validan como uuid aquí porque en los datos de
// ejemplo no lo son; en la API serán `z.uuid()` y `where: { id, userId }`.

// Las cinco pestañas, Inicio y la Agenda leen de los mismos movimientos.
function refresh() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/')
  revalidatePath('/agenda')
}

// Lo que todavía falta pagar de una deuda, sin contar un pago que se está corrigiendo.
function debtRemaining(world: FinanceWorld, debtId: string, ignoreId: string | null): number | null {
  const debt = world.debts.find((item) => item.id === debtId)
  if (!debt) return null
  const others = world.transactions.filter((item) => item.id !== ignoreId)
  return debt.totalCents - paidOf(debt.id, others)
}

// Crea un movimiento (transactionId null) o corrige uno existente. Aparte de la forma, se revisa que lo que
// nombra exista (categoría del tipo correcto, cuenta, ahorro, deuda) y que no se pague de más ni se retire
// más de lo ahorrado.
export async function saveTransactionAction(transactionId: string | null, raw: unknown): Promise<FinanceActionResult> {
  if (transactionId !== null && !financeIdSchema.safeParse(transactionId).success) return failure('No encontramos ese movimiento.')
  const parsed = transactionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadFinance()
  const input = parsed.data

  const existing = transactionId === null ? null : world.transactions.find((item) => item.id === transactionId)
  if (transactionId !== null && !existing) return failure('No encontramos ese movimiento.')

  if (input.cardId !== null && !world.cards.some((card) => card.id === input.cardId)) return { ok: false, errors: { cardId: 'Elige una cuenta.' } }

  // Gastos e ingresos llevan categoría de su tipo; ahorros y deudas, no.
  const isMoneyIn = input.kind === 'income'
  const isCategorized = input.kind === 'expense' || isMoneyIn
  if (isCategorized) {
    const category = world.categories.find((item) => item.id === input.categoryId)
    if (!category || category.kind !== (isMoneyIn ? 'income' : 'expense')) return { ok: false, errors: { categoryId: 'Elige una categoría.' } }
  }

  if (input.kind === 'saving_deposit' || input.kind === 'saving_withdrawal') {
    if (!world.savings.some((goal) => goal.id === input.savingId)) return { ok: false, errors: { savingId: 'Elige a qué ahorro va.' } }
    if (input.kind === 'saving_withdrawal') {
      const others = world.transactions.filter((item) => item.id !== transactionId)
      const available = savedOf(input.savingId ?? '', others)
      if (input.amountCents > available) return { ok: false, errors: { amountCents: `Solo tienes ${formatMoney(available)} en ese ahorro.` } }
    }
  }

  if (input.kind === 'debt_payment') {
    const remaining = debtRemaining(world, input.debtId ?? '', transactionId)
    if (remaining === null) return { ok: false, errors: { debtId: 'Elige qué deuda pagas.' } }
    if (input.amountCents > remaining) return { ok: false, errors: { amountCents: `Solo te faltan ${formatMoney(Math.max(0, remaining))} de esa deuda.` } }
  }

  const transaction: Transaction = {
    id: existing?.id ?? crypto.randomUUID(),
    kind: input.kind,
    amountCents: input.amountCents,
    currency: FINANCE_CURRENCY,
    concept: input.concept,
    note: input.note,
    occurredOn: input.occurredOn,
    categoryId: isCategorized ? input.categoryId : null,
    cardId: input.cardId,
    savingId: input.kind === 'saving_deposit' || input.kind === 'saving_withdrawal' ? input.savingId : null,
    debtId: input.kind === 'debt_payment' ? input.debtId : null,
    membershipId: existing?.membershipId ?? null,
    repeatMonthly: input.repeatMonthly,
  }

  if (existing) world.transactions.splice(world.transactions.indexOf(existing), 1)
  insertTransaction(world, transaction)
  refresh()
  return { ok: true, id: transaction.id }
}

// Borra un movimiento. Va a la papelera: el aviso trae "Deshacer".
export async function deleteTransactionAction(transactionId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(transactionId).success) return failure('No encontramos ese movimiento.')

  await mockDelay()
  const { world } = await loadFinance()
  const index = world.transactions.findIndex((item) => item.id === transactionId)
  if (index === -1) return failure('No encontramos ese movimiento.')

  const [removed] = world.transactions.splice(index, 1)
  const undoToken = rememberUndo(world, () => world.transactions.splice(Math.min(index, world.transactions.length), 0, removed))
  refresh()
  return { ok: true, id: transactionId, undoToken }
}

// "Deshacer" de cualquier borrado de Finanzas (movimientos, ahorros, deudas, membresías, tarjetas,
// categorías, límites): cada acción guarda cómo volver atrás y le da su token al aviso.
export async function undoFinanceAction(token: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(token).success) return failure('Ya no se puede deshacer.')

  await mockDelay()
  const { world } = await loadFinance()
  if (!runUndo(world, token)) return failure('Ya no se puede deshacer.')
  refresh()
  return { ok: true }
}
