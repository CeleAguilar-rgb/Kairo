'use server'

import { cardSchema, financeIdSchema, membershipSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { api } from '@/lib/api-client'
import { fieldErrors } from '@/lib/form-errors'

import { apiFailure } from './action-errors'
import { failure, type FinanceActionResult } from './action-result'
import type { MembershipRecord, PaymentCard } from './types'

// Las acciones de Membresías y tarjetas. Las membresías de las que se cobra salen en "Próximos pagos" de
// Inicio y en la Agenda: por eso todo se revalida.

function refresh() {
  revalidatePath('/finanzas', 'layout')
  revalidatePath('/')
  revalidatePath('/agenda')
}

// Crea una membresía (membershipId null) o edita una existente (incluida pausarla o retomarla). El próximo cobro
// no se guarda: se calcula al leer con el día de cobro.
export async function saveMembershipAction(membershipId: string | null, raw: unknown): Promise<FinanceActionResult> {
  if (membershipId !== null && !financeIdSchema.safeParse(membershipId).success) return failure('No encontramos esa membresía.')
  const parsed = membershipSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const record =
      membershipId === null
        ? await api.post<MembershipRecord>('/finance/memberships', parsed.data)
        : await api.patch<MembershipRecord>(`/finance/memberships/${membershipId}`, parsed.data)
    refresh()
    return { ok: true, id: record.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar la membresía. Intenta de nuevo.')
  }
}

// Borra una membresía. Va a la papelera: el aviso trae "Deshacer".
export async function deleteMembershipAction(membershipId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(membershipId).success) return failure('No encontramos esa membresía.')

  try {
    const result = await api.delete<{ id: string; undoToken: string }>(`/finance/memberships/${membershipId}`)
    refresh()
    return { ok: true, id: membershipId, undoToken: result.undoToken }
  } catch (error) {
    return apiFailure(error, 'No pudimos borrar la membresía. Intenta de nuevo.')
  }
}

// Crea una tarjeta o cuenta. Solo alias y últimos 4 dígitos (regla 9 de CLAUDE.md): el efectivo no lleva números.
// La API vuelve a validarlo, y la base misma rechaza cualquier `last4` que no sean 4 dígitos.
export async function createCardAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = cardSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  try {
    const card = await api.post<PaymentCard>('/finance/cards', parsed.data)
    refresh()
    return { ok: true, id: card.id }
  } catch (error) {
    return apiFailure(error, 'No pudimos guardar la tarjeta. Intenta de nuevo.')
  }
}

// Borra una tarjeta junto con sus membresías (la pantalla ya las mostró en la confirmación). Los movimientos
// pasados se quedan y siguen diciendo con cuál se pagaron. Va a la papelera: "Deshacer" devuelve las dos cosas.
export async function deleteCardAction(cardId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(cardId).success) return failure('No encontramos esa tarjeta.')

  try {
    const result = await api.delete<{ id: string; undoToken: string }>(`/finance/cards/${cardId}`)
    refresh()
    return { ok: true, id: cardId, undoToken: result.undoToken }
  } catch (error) {
    return apiFailure(error, 'No pudimos borrar la tarjeta. Intenta de nuevo.')
  }
}
