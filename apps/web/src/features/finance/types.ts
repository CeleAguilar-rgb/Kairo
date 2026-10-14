import type { IsoDate } from '@/lib/dates'

// Tablas cards y memberships de docs/guides/data-model.md (camelCase).
// Dinero siempre en centavos enteros + currency (regla 7). De la tarjeta solo
// alias y últimos 4 dígitos (regla 9).
export type CardKind = 'debit' | 'credit'

export type PaymentCard = {
  id: string
  name: string
  kind: CardKind
  last4: string
}

export const CARD_KIND_LABEL: Record<CardKind, string> = {
  debit: 'Débito',
  credit: 'Crédito',
}

export type Membership = {
  id: string
  name: string
  amountCents: number
  currency: string
  cadence: 'monthly' | 'yearly'
  chargeDay: number
  nextChargeOn: IsoDate
  card: PaymentCard | null
}
