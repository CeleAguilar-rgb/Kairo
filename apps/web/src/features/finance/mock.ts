import 'server-only'

import { dayOfMonth } from '@/lib/dates'
import type { MockContext } from '@/lib/mock/context'

import type { Membership, PaymentCard } from './types'

const CARDS: Record<string, PaymentCard> = {
  debit: { id: 'c1', name: 'Débito', kind: 'debit', last4: '4417' },
  credit: { id: 'c2', name: 'Crédito', kind: 'credit', last4: '0921' },
}

// "Próximos pagos" de Main.dc.html. El cobro va a N días de hoy en lugar de una fecha fija.
const SEEDS = [
  { id: 'ms1', name: 'Spotify', cents: 12_900, inDays: 1, card: 'debit' },
  { id: 'ms2', name: 'Netflix', cents: 29_900, inDays: 2, card: 'credit' },
  { id: 'ms3', name: 'Claude Pro', cents: 19_900, inDays: 3, card: 'credit' },
  { id: 'ms4', name: 'Gimnasio', cents: 45_000, inDays: 10, card: 'debit' },
  { id: 'ms5', name: 'Dominio kairo', cents: 24_000, inDays: 40, card: 'credit' },
] as const

export function buildMemberships(ctx: MockContext): Membership[] {
  return SEEDS.map((seed) => {
    const nextChargeOn = ctx.day(seed.inDays)
    return {
      id: seed.id,
      name: seed.name,
      amountCents: seed.cents,
      currency: 'MXN',
      cadence: seed.id === 'ms5' ? 'yearly' : 'monthly',
      chargeDay: dayOfMonth(nextChargeOn),
      nextChargeOn,
      card: CARDS[seed.card],
    }
  })
}
