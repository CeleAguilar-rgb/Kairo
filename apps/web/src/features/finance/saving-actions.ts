'use server'

import { FINANCE_CURRENCY, debtSchema, financeIdSchema, moneyAmountSchema, savingGoalSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'
import { formatMoney } from '@/lib/money'

import { failure, type FinanceActionResult } from './action-result'
import { firstOfNextMonth, paidOf, savedOf } from './finance-utils'
import { insertTransaction, loadFinance, rememberUndo } from './mock-store'
import type { Debt, SavingGoal, Transaction } from './types'

// Las acciones de Ahorros y deudas. Aportar, retirar y pagar no tocan un saldo guardado: crean un movimiento,
// y el avance de cada ahorro y de cada deuda se calcula de ellos (finance-utils.ts). Así el Resumen, los
// Movimientos y esta pestaña siempre dicen lo mismo.

function refresh() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/')
}

// Crea un ahorro con su meta. Lo ahorrado empieza en cero: se llena aportando.
export async function createSavingAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = savingGoalSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadFinance()
  const goal: SavingGoal = { id: crypto.randomUUID(), name: parsed.data.name, targetCents: parsed.data.targetCents, dueOn: parsed.data.dueOn }
  world.savings.push(goal)
  refresh()
  return { ok: true, id: goal.id }
}

// Crea una deuda. Con pago por mes, su próximo pago es el primer día del mes que viene.
export async function createDebtAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = debtSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world, ctx } = await loadFinance()
  const input = parsed.data
  const debt: Debt = {
    id: crypto.randomUUID(),
    name: input.name,
    kind: input.kind,
    totalCents: input.totalCents,
    annualInterestPct: input.annualInterestPct,
    monthlyPaymentCents: input.monthlyPaymentCents,
    nextPaymentOn: input.monthlyPaymentCents ? firstOfNextMonth(ctx.today) : null,
  }
  world.debts.push(debt)
  refresh()
  return { ok: true, id: debt.id }
}

// La cuenta con la que se mueven los aportes y pagos rápidos: la primera de débito (o, si no hay, ninguna).
function defaultCardId(cards: { id: string; kind: string }[]): string | null {
  return cards.find((card) => card.kind === 'debit')?.id ?? null
}

// "Aportar" y "Retirar": un movimiento a ese ahorro. No se puede retirar más de lo que hay.
export async function moveSavingAction(savingId: string, direction: 'deposit' | 'withdraw', raw: unknown): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(savingId).success || (direction !== 'deposit' && direction !== 'withdraw')) return failure('No encontramos ese ahorro.')
  const parsed = moneyAmountSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world, ctx } = await loadFinance()
  const goal = world.savings.find((item) => item.id === savingId)
  if (!goal) return failure('No encontramos ese ahorro.')

  if (direction === 'withdraw') {
    const available = savedOf(goal.id, world.transactions)
    if (parsed.data.amountCents > available) return { ok: false, errors: { amountCents: `Solo tienes ${formatMoney(available)} en este ahorro.` } }
  }

  const transaction: Transaction = {
    id: crypto.randomUUID(),
    kind: direction === 'deposit' ? 'saving_deposit' : 'saving_withdrawal',
    amountCents: parsed.data.amountCents,
    currency: FINANCE_CURRENCY,
    concept: goal.name,
    note: '',
    occurredOn: ctx.today,
    categoryId: null,
    cardId: defaultCardId(world.cards),
    savingId: goal.id,
    debtId: null,
    membershipId: null,
    repeatMonthly: false,
  }
  insertTransaction(world, transaction)
  refresh()
  return { ok: true, id: transaction.id }
}

// "Registrar pago": un movimiento a esa deuda. Si el monto pasa de lo que falta, se paga solo lo que falta;
// al llegar a cero la deuda queda liquidada.
export async function payDebtAction(debtId: string, raw: unknown): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(debtId).success) return failure('No encontramos esa deuda.')
  const parsed = moneyAmountSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world, ctx } = await loadFinance()
  const debt = world.debts.find((item) => item.id === debtId)
  if (!debt) return failure('No encontramos esa deuda.')

  const remaining = debt.totalCents - paidOf(debt.id, world.transactions)
  if (remaining <= 0) return failure('Esa deuda ya está pagada.')
  const amountCents = Math.min(parsed.data.amountCents, remaining)

  const transaction: Transaction = {
    id: crypto.randomUUID(),
    kind: 'debt_payment',
    amountCents,
    currency: FINANCE_CURRENCY,
    concept: `Pago ${debt.name}`,
    note: '',
    occurredOn: ctx.today,
    categoryId: null,
    cardId: defaultCardId(world.cards),
    savingId: null,
    debtId: debt.id,
    membershipId: null,
    repeatMonthly: false,
  }
  insertTransaction(world, transaction)
  refresh()
  return { ok: true, id: transaction.id, liquidated: amountCents >= remaining }
}

// Borra un ahorro. Sus aportes se quedan en los movimientos (la historia no se borra); solo deja de salir en la
// lista. Va a la papelera: el aviso trae "Deshacer".
export async function deleteSavingAction(savingId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(savingId).success) return failure('No encontramos ese ahorro.')

  await mockDelay()
  const { world } = await loadFinance()
  const index = world.savings.findIndex((item) => item.id === savingId)
  if (index === -1) return failure('No encontramos ese ahorro.')

  const [removed] = world.savings.splice(index, 1)
  const undoToken = rememberUndo(world, () => world.savings.splice(Math.min(index, world.savings.length), 0, removed))
  refresh()
  return { ok: true, id: savingId, undoToken }
}

// Borra una deuda con la misma idea: sus pagos se quedan en los movimientos.
export async function deleteDebtAction(debtId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(debtId).success) return failure('No encontramos esa deuda.')

  await mockDelay()
  const { world } = await loadFinance()
  const index = world.debts.findIndex((item) => item.id === debtId)
  if (index === -1) return failure('No encontramos esa deuda.')

  const [removed] = world.debts.splice(index, 1)
  const undoToken = rememberUndo(world, () => world.debts.splice(Math.min(index, world.debts.length), 0, removed))
  refresh()
  return { ok: true, id: debtId, undoToken }
}
