'use server'

import { isoDateSchema, journalEntrySchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api, ApiError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import { failure, type DailyActionResult } from './action-result'
import { getDaySummary } from './api'
import type { JournalEntry } from './types'

// Las acciones del Diario. El cuerpo se guarda sin cifrar y sin PIN (decisión #38, a pedido explícito
// de la usuaria): security.md pedía argon2 + AES-256-GCM para esto, pero por ahora el Diario queda al
// mismo nivel que cualquier otro texto del usuario — solo protegido por la sesión, como todo lo demás.

function refresh() {
  revalidatePath('/dia-a-dia', 'layout')
}

function apiFailure(error: unknown, fallback: string): DailyActionResult {
  return failure(error instanceof ApiError ? error.message : fallback)
}

// Guarda (o actualiza) la entrada de hoy. Una por día: si ya existe, se reemplaza. "Tu día en resumen"
// se congela al guardar (getDaySummary), por eso se arma aquí y se manda ya hecho: la API solo guarda
// lo que recibe, no sabe de rutinas ni de bloques (esa cuenta vive en este lado, decisión #37/#39).
export async function saveJournalAction(raw: unknown): Promise<DailyActionResult> {
  const parsed = journalEntrySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const summary = await getDaySummary()
    const entry = await api.post<JournalEntry>('/journal-entries', { ...parsed.data, summary })
    refresh()
    return { ok: true, id: entry.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar la entrada. Intenta de nuevo.')
  }
}

// Borra la entrada de un día. Va a la papelera: el aviso trae "Deshacer".
export async function deleteJournalAction(date: string): Promise<DailyActionResult> {
  if (!isoDateSchema.safeParse(date).success) return failure('No encontramos esa entrada.')

  try {
    const res = await api.delete<{ id: string; undoToken: string }>(`/journal-entries/${date}`)
    refresh()
    return { ok: true, id: res.id, undoToken: res.undoToken }
  } catch (error) {
    return apiFailure(error, 'No se pudo borrar.')
  }
}
