import type { cards, categories, debts, memberships, savingsGoals, transactions } from '../../db/schema/finance'

// De una fila de la base a lo que devuelve la API. Los nombres y la forma son los de los tipos de
// apps/web/src/features/finance/types.ts: el front no cambia al reconectarse.

type CardRow = typeof cards.$inferSelect
type CategoryRow = typeof categories.$inferSelect
type TransactionRow = typeof transactions.$inferSelect
type SavingRow = typeof savingsGoals.$inferSelect
type DebtRow = typeof debts.$inferSelect
type MembershipRow = typeof memberships.$inferSelect

export function toCard(row: CardRow) {
  return { id: row.id, name: row.name, kind: row.kind, last4: row.last4, color: row.color, cutDay: row.cutDay, dueDay: row.dueDay }
}

// `key` solo la traen las categorías que la API crea sola ("other" es "Otros", la que no se puede borrar).
export function toCategory(row: CategoryRow) {
  return { id: row.id, key: row.key, name: row.name, kind: row.kind, color: row.color, icon: row.icon, limitCents: row.monthlyLimitCents }
}

// `categoryId` ya viene resuelto por el service (una categoría borrada se cuenta en "Otros").
export function toTransaction(row: TransactionRow, categoryId: string | null = row.categoryId) {
  return {
    id: row.id,
    kind: row.kind,
    amountCents: row.amountCents,
    currency: row.currency,
    concept: row.concept,
    note: row.note,
    occurredOn: row.occurredOn,
    categoryId,
    cardId: row.cardId,
    savingId: row.savingId,
    debtId: row.debtId,
    membershipId: row.membershipId,
    repeatMonthly: row.repeatMonthly,
  }
}

// Lo ahorrado es la suma de los movimientos de ese ahorro (aportes menos retiros), nunca negativa. No se
// guarda: lo trae el service ya sumado.
export function toSaving(row: SavingRow, savedCents: number) {
  return { id: row.id, name: row.name, targetCents: row.targetCents, dueOn: row.dueOn, savedCents: Math.max(0, savedCents) }
}

// Lo pagado y el día del último pago salen de los movimientos de esa deuda: el front decide con ellos cuánto
// falta y si ya se liquidó.
export function toDebt(row: DebtRow, paid: { paidCents: number; lastPaymentOn: string | null }) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    totalCents: row.totalCents,
    annualInterestPct: row.annualInterestPct,
    monthlyPaymentCents: row.monthlyPaymentCents,
    nextPaymentOn: row.nextPaymentOn,
    paidCents: paid.paidCents,
    lastPaymentOn: paid.lastPaymentOn,
  }
}

export function toMembership(row: MembershipRow) {
  return {
    id: row.id,
    name: row.name,
    amountCents: row.amountCents,
    currency: row.currency,
    cadence: row.cadence,
    chargeDay: row.chargeDay,
    chargeMonth: row.chargeMonth,
    chargeWeekday: row.chargeWeekday,
    cardId: row.cardId,
    notify: row.notify,
    status: row.status,
  }
}
