import 'server-only'

import { revalidatePath } from 'next/cache'

import { ApiError } from '@/lib/api-client'
import { DEMO_MODE } from '@/lib/demo'
import { fieldErrors } from '@/lib/form-errors'

import { failure, type WritingActionResult } from './action-result'

// Lo común de las acciones de Escritos: qué responder cuando la API dice que no y qué pantallas refrescar. Va aparte
// de action-result.ts porque ese lo importan también componentes del navegador, y este solo puede cargarse en el
// servidor (importa el cliente de la API).

// Un error de la API que es de un campo del formulario va junto a ese campo.
const FIELD_BY_CODE: Record<string, string> = { STORY_NOT_FOUND: 'storyId' }

export function apiFailure(error: unknown, fallback: string): WritingActionResult {
  if (DEMO_MODE) return failure('En el modo demo no se guarda nada: es solo para mirar.')
  if (error instanceof ApiError) {
    const field = error.status === 400 ? FIELD_BY_CODE[error.code] : undefined
    return field ? { ok: false, errors: { [field]: error.message } } : failure(error.message)
  }
  return failure(fallback)
}

// Lo que llegó de la pantalla no pasó el esquema: el primer error de cada campo.
export function invalid(issues: { path: PropertyKey[]; message: string }[], message?: string): WritingActionResult {
  const errors = fieldErrors(issues)
  return { ok: false, errors, message: message ?? Object.values(errors)[0] }
}

// Todo Escritos lee de una sola biblioteca: cualquier cambio refresca el layout entero (Inicio, el mundo, la página).
export function refreshWritings() {
  revalidatePath('/escritos', 'layout')
}
