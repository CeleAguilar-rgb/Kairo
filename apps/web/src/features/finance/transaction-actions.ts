'use server'

import { financeIdSchema, financeUndoTokenSchema, transactionSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import { apiFailure } from './action-errors'
import { failure, type FinanceActionResult } from './action-result'
import type { Transaction } from './types'

// Las acciones de Movimientos. Una Server Action es un endpoint público: lo que llega NO se confía, se vuelve a
// validar con el mismo esquema del front (packages/shared), y ese esquema también es el contrato de
// `POST /v1/finance/transactions` en la API: ahí se revalida otra vez. La API pone el userId con el token
// (regla 2), filtra toda consulta por él (regla 3) y revisa lo que no se le puede confiar al front: que la
// cuenta, la categoría, el ahorro y la deuda que nombra el movimiento existan y sean de la persona, y que no
// se retire más de lo ahorrado ni se pague de más una deuda.

// Las cinco pestañas, Inicio y la Agenda leen de los mismos movimientos.
function refresh() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/')
  revalidatePath('/agenda')
}

// Crea un movimiento (transactionId null) o corrige uno existente.
export async function saveTransactionAction(transactionId: string | null, raw: unknown): Promise<FinanceActionResult> {
  if (transactionId !== null && !financeIdSchema.safeParse(transactionId).success) return failure('No encontramos ese movimiento.')
  const parsed = transactionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const transaction =
      transactionId === null
        ? await api.post<Transaction>('/finance/transactions', parsed.data)
        : await api.patch<Transaction>(`/finance/transactions/${transactionId}`, parsed.data)
    refresh()
    return { ok: true, id: transaction.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar el movimiento. Intenta de nuevo.')
  }
}

// Borra un movimiento. Va a la papelera: el aviso trae "Deshacer".
export async function deleteTransactionAction(transactionId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(transactionId).success) return failure('No encontramos ese movimiento.')

  try {
    const result = await api.delete<{ id: string; undoToken: string }>(`/finance/transactions/${transactionId}`)
    refresh()
    return { ok: true, id: transactionId, undoToken: result.undoToken }
  } catch (error) {
    return apiFailure(error, 'No pudimos borrar el movimiento. Intenta de nuevo.')
  }
}

// "Deshacer" de cualquier borrado de Finanzas (movimientos, ahorros, deudas, membresías, tarjetas, categorías)
// y de "Usar lo real": la API da un token que trae codificado qué restaurar (finance-undo.ts, en la API) y
// aquí solo se le devuelve.
export async function undoFinanceAction(token: string): Promise<FinanceActionResult> {
  if (!financeUndoTokenSchema.safeParse(token).success) return failure('Ya no se puede deshacer.')

  try {
    await api.post('/finance/undo', { token })
    refresh()
    return { ok: true }
  } catch (error) {
    return apiFailure(error, 'Ya no se puede deshacer.')
  }
}
