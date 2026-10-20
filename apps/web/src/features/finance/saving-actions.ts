'use server'

import { debtSchema, financeIdSchema, moneyAmountSchema, savingGoalSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import { apiFailure } from './action-errors'
import { failure, type FinanceActionResult } from './action-result'
import type { DebtRecord, SavingRecord, Transaction } from './types'

// Las acciones de Ahorros y deudas. Aportar, retirar y pagar no tocan un saldo guardado: la API crea un
// movimiento (de hoy, en la zona del perfil, y con la primera cuenta de débito) y el avance de cada ahorro y
// de cada deuda se calcula de ellos. Así el Resumen, los Movimientos y esta pestaña siempre dicen lo mismo.

function refresh() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/')
}

// Crea un ahorro con su meta. Lo ahorrado empieza en cero: se llena aportando.
export async function createSavingAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = savingGoalSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const goal = await api.post<SavingRecord>('/finance/savings', parsed.data)
    refresh()
    return { ok: true, id: goal.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar el ahorro. Intenta de nuevo.')
  }
}

// Crea una deuda. Con pago por mes, su próximo pago es el primer día del mes que viene (lo pone la API).
export async function createDebtAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = debtSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const debt = await api.post<DebtRecord>('/finance/debts', parsed.data)
    refresh()
    return { ok: true, id: debt.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar la deuda. Intenta de nuevo.')
  }
}

// "Aportar" y "Retirar": un movimiento a ese ahorro. La API no deja retirar más de lo que hay.
export async function moveSavingAction(savingId: string, direction: 'deposit' | 'withdraw', raw: unknown): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(savingId).success || (direction !== 'deposit' && direction !== 'withdraw')) return failure('No encontramos ese ahorro.')
  const parsed = moneyAmountSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const transaction = await api.post<Transaction>(`/finance/savings/${savingId}/${direction}`, parsed.data)
    refresh()
    return { ok: true, id: transaction.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos registrar el movimiento. Intenta de nuevo.')
  }
}

// "Registrar pago": un movimiento a esa deuda. Si el monto pasa de lo que falta, la API paga solo lo que falta;
// al llegar a cero la deuda queda liquidada y se avisa.
export async function payDebtAction(debtId: string, raw: unknown): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(debtId).success) return failure('No encontramos esa deuda.')
  const parsed = moneyAmountSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const result = await api.post<{ transaction: Transaction; liquidated: boolean }>(`/finance/debts/${debtId}/pay`, parsed.data)
    refresh()
    return { ok: true, id: result.transaction.id, liquidated: result.liquidated }
  } catch (error) {
    return apiFailure(error, 'No pudimos registrar el pago. Intenta de nuevo.')
  }
}

// Borra un ahorro. Sus aportes se quedan en los movimientos (la historia no se borra); solo deja de salir en la
// lista. Va a la papelera: el aviso trae "Deshacer".
export async function deleteSavingAction(savingId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(savingId).success) return failure('No encontramos ese ahorro.')

  try {
    const result = await api.delete<{ id: string; undoToken: string }>(`/finance/savings/${savingId}`)
    refresh()
    return { ok: true, id: savingId, undoToken: result.undoToken }
  } catch (error) {
    return apiFailure(error, 'No pudimos borrar el ahorro. Intenta de nuevo.')
  }
}

// Borra una deuda con la misma idea: sus pagos se quedan en los movimientos.
export async function deleteDebtAction(debtId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(debtId).success) return failure('No encontramos esa deuda.')

  try {
    const result = await api.delete<{ id: string; undoToken: string }>(`/finance/debts/${debtId}`)
    refresh()
    return { ok: true, id: debtId, undoToken: result.undoToken }
  } catch (error) {
    return apiFailure(error, 'No pudimos borrar la deuda. Intenta de nuevo.')
  }
}
