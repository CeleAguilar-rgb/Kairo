import 'server-only'

import { ApiError } from '@/lib/api-client'

import { failure, type FinanceActionResult } from './action-result'

// Un error de la API que es de UN campo del formulario ("Solo tienes $500 en ese ahorro" va debajo del campo
// del monto, no en un aviso suelto). Solo cuentan los 400: un mismo código puede ser un 404 en otra ruta (por
// ejemplo SAVING_NOT_FOUND al aportar a un ahorro que ya no existe) y ahí es un error general.
// Va en un archivo aparte de action-result.ts porque ese lo importan también componentes del navegador, y
// este solo puede cargarse en el servidor (importa el cliente de la API).
const FIELD_BY_CODE: Record<string, string> = {
  CARD_NOT_FOUND: 'cardId',
  CATEGORY_INVALID: 'categoryId',
  SAVING_NOT_FOUND: 'savingId',
  SAVING_INSUFFICIENT: 'amountCents',
  DEBT_NOT_FOUND: 'debtId',
  DEBT_OVERPAID: 'amountCents',
  CATEGORY_NAME_TAKEN: 'name',
}

export function apiFailure(error: unknown, fallback: string): FinanceActionResult {
  if (error instanceof ApiError) {
    const field = error.status === 400 ? FIELD_BY_CODE[error.code] : undefined
    if (field) return { ok: false, errors: { [field]: error.message } }
    return failure(error.message)
  }
  return failure(fallback)
}
