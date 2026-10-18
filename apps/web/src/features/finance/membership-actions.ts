'use server'

import { FINANCE_CURRENCY, cardSchema, financeIdSchema, membershipSchema } from '@kairo/shared'
import { revalidatePath } from 'next/cache'

import { fieldErrors } from '@/lib/form-errors'
import { mockDelay } from '@/lib/mock/context'

import { failure, type FinanceActionResult } from './action-result'
import { loadFinance, rememberUndo } from './mock-store'
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

  await mockDelay()
  const { world } = await loadFinance()
  const input = parsed.data

  if (input.cardId !== null && !world.cards.some((card) => card.id === input.cardId)) return { ok: false, errors: { cardId: 'Elige con qué se paga.' } }

  const record: MembershipRecord = {
    id: membershipId ?? crypto.randomUUID(),
    name: input.name,
    amountCents: input.amountCents,
    currency: FINANCE_CURRENCY,
    cadence: input.cadence,
    // Solo cuenta lo que pide cada frecuencia: lo demás no se guarda.
    chargeDay: input.cadence === 'weekly' ? null : input.chargeDay,
    chargeMonth: input.cadence === 'yearly' ? input.chargeMonth : null,
    chargeWeekday: input.cadence === 'weekly' ? input.chargeWeekday : null,
    cardId: input.cardId,
    notify: input.notify,
    status: input.status,
  }

  if (membershipId === null) {
    world.memberships.push(record)
  } else {
    const index = world.memberships.findIndex((item) => item.id === membershipId)
    if (index === -1) return failure('No encontramos esa membresía.')
    world.memberships[index] = record
  }
  refresh()
  return { ok: true, id: record.id }
}

// Borra una membresía. Va a la papelera: el aviso trae "Deshacer".
export async function deleteMembershipAction(membershipId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(membershipId).success) return failure('No encontramos esa membresía.')

  await mockDelay()
  const { world } = await loadFinance()
  const index = world.memberships.findIndex((item) => item.id === membershipId)
  if (index === -1) return failure('No encontramos esa membresía.')

  const [removed] = world.memberships.splice(index, 1)
  const undoToken = rememberUndo(world, () => world.memberships.splice(Math.min(index, world.memberships.length), 0, removed))
  refresh()
  return { ok: true, id: membershipId, undoToken }
}

// Crea una tarjeta o cuenta. Solo alias y últimos 4 dígitos (regla 9 de CLAUDE.md): el efectivo no lleva números.
export async function createCardAction(raw: unknown): Promise<FinanceActionResult> {
  const parsed = cardSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) }

  await mockDelay()
  const { world } = await loadFinance()
  const input = parsed.data
  const card: PaymentCard = {
    id: crypto.randomUUID(),
    name: input.name,
    kind: input.kind,
    last4: input.kind === 'cash' ? null : input.last4,
    color: input.color,
    cutDay: input.kind === 'credit' ? input.cutDay : null,
    dueDay: input.kind === 'credit' ? input.dueDay : null,
  }
  world.cards.push(card)
  refresh()
  return { ok: true, id: card.id }
}

// Borra una tarjeta junto con sus membresías (la pantalla ya las mostró en la confirmación). Los movimientos
// pasados se quedan y siguen diciendo con cuál se pagaron. Va a la papelera: "Deshacer" devuelve las dos cosas.
export async function deleteCardAction(cardId: string): Promise<FinanceActionResult> {
  if (!financeIdSchema.safeParse(cardId).success) return failure('No encontramos esa tarjeta.')

  await mockDelay()
  const { world } = await loadFinance()
  const index = world.cards.findIndex((item) => item.id === cardId)
  if (index === -1) return failure('No encontramos esa tarjeta.')

  const [card] = world.cards.splice(index, 1)
  world.archivedCards.push(card)
  const removed = world.memberships.filter((item) => item.cardId === cardId)
  world.memberships = world.memberships.filter((item) => item.cardId !== cardId)

  const undoToken = rememberUndo(world, () => {
    world.archivedCards = world.archivedCards.filter((item) => item.id !== cardId)
    world.cards.splice(Math.min(index, world.cards.length), 0, card)
    world.memberships.push(...removed)
  })
  refresh()
  return { ok: true, id: cardId, undoToken }
}
