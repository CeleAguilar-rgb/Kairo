import 'server-only'

import { FINANCE_MONTHS_BACK } from '@kairo/shared'
import { cache } from 'react'

import { api } from '@/lib/api-client'
import { dayOfMonth, daysInMonth, type IsoDate } from '@/lib/dates'
import { DEMO_MODE } from '@/lib/demo'
import { getMockContext, type MockContext } from '@/lib/mock/context'

import {
  budgetProgressText,
  budgetRows,
  budgetTotals,
  categoryShares,
  clampMonth,
  debtView,
  incomeSourcesText,
  monthBars,
  monthOf,
  monthStartOf,
  monthWindow,
  monthlyEquivalentCents,
  savedTargetsText,
  savingView,
  shiftMonth,
  toMembership,
  totalsOf,
  transactionsOfMonth,
} from './finance-utils'
import { buildFinanceSeed } from './mock'
import type {
  BudgetView,
  CardView,
  ChargeRow,
  FinanceRecords,
  FinanceSummary,
  Membership,
  MembershipsData,
  MembershipsView,
  MonthKey,
  MovementsView,
  PaymentCard,
  SavingsDebtsView,
} from './types'

// Las lecturas de Finanzas. La API devuelve hechos crudos (decisión #38, igual que Agenda y Día a día): las
// filas tal cual y, de ahorros y deudas, lo ahorrado y lo pagado ya sumados (un SUM sobre todos sus
// movimientos). Cada función de aquí arma con eso lo que necesita una pestaña (totales, filas de presupuesto,
// textos de avance, gráfica de 6 meses) con la lógica de finance-utils.ts, que no se duplica en el servidor.
// Modo demo (lib/demo.ts): no hay Supabase ni API, se arma la semilla de datos de ejemplo (mock.ts).

// Lo que leen las cinco pestañas. `from` es el primer día de la ventana de 6 meses: la API no manda los
// movimientos más viejos (ninguna pantalla los usa). `cache` hace que Resumen, Movimientos y el resto compartan
// UNA sola petición dentro de la misma página.
const loadRecords = cache(async (from: IsoDate): Promise<FinanceRecords> => {
  if (DEMO_MODE) return buildFinanceSeed(await getMockContext())
  return api.get<FinanceRecords>(`/finance/records?from=${from}`)
})

async function loadFinance(): Promise<{ world: FinanceRecords; ctx: MockContext }> {
  const ctx = await getMockContext()
  const from = monthStartOf(shiftMonth(monthOf(ctx.today), -FINANCE_MONTHS_BACK))
  return { world: await loadRecords(from), ctx }
}

// Lo mínimo que leen Inicio ("Próximos pagos"), la Agenda y Membresías: las membresías y sus tarjetas, sin
// bajar ningún movimiento.
const loadMemberships = cache(async (): Promise<MembershipsData> => {
  if (DEMO_MODE) {
    const seed = buildFinanceSeed(await getMockContext())
    return { cards: seed.cards, memberships: seed.memberships }
  }
  return api.get<MembershipsData>('/finance/memberships')
})

// Todas las cuentas que un movimiento puede nombrar: las vivas y las que se borraron (los movimientos viejos
// siguen diciendo con cuál se pagaron).
const allCards = (world: FinanceRecords): PaymentCard[] => [...world.cards, ...world.archivedCards]

// El mes que se está viendo (el de la dirección, recortado) y los límites para las flechas.
export async function getFinanceMonth(raw?: string): Promise<{ month: MonthKey; current: MonthKey; oldest: MonthKey; today: IsoDate }> {
  const ctx = await getMockContext()
  const current = monthOf(ctx.today)
  return { month: clampMonth(raw, ctx.today), current, oldest: shiftMonth(current, -FINANCE_MONTHS_BACK), today: ctx.today }
}

// Los cobros que vienen, del más próximo al más lejano, solo de las membresías activas. Los leen Inicio
// ("Próximos pagos"), la Agenda y la pestaña Membresías.
export async function listUpcomingPayments(): Promise<Membership[]> {
  const [{ cards, memberships }, ctx] = await Promise.all([loadMemberships(), getMockContext()])
  return memberships
    .filter((record) => record.status === 'active')
    .map((record) => toMembership(record, cards, ctx.today))
    .sort((a, b) => a.nextChargeOn.localeCompare(b.nextChargeOn))
}

// Resumen: las cifras del mes, la gráfica de 6 meses y un vistazo de presupuesto, ahorros, deudas, cobros y
// movimientos.
export async function getFinanceSummary(raw?: string): Promise<FinanceSummary> {
  const { world, ctx } = await loadFinance()
  const current = monthOf(ctx.today)
  const month = clampMonth(raw, ctx.today)
  const isCurrentMonth = month === current

  const monthTransactions = transactionsOfMonth(world.transactions, month)
  const rows = budgetRows(world.categories, monthTransactions)

  const charges: ChargeRow[] = world.memberships
    .filter((record) => record.status === 'active')
    .map((record) => toMembership(record, world.cards, ctx.today))
    .sort((a, b) => a.nextChargeOn.localeCompare(b.nextChargeOn))
    .slice(0, 4)
    .map((membership) => ({
      id: membership.id,
      name: membership.name,
      amountCents: membership.amountCents,
      currency: membership.currency,
      nextChargeOn: membership.nextChargeOn,
      card: membership.card,
    }))

  const day = dayOfMonth(ctx.today)
  return {
    month,
    isCurrentMonth,
    totals: totalsOf(monthTransactions),
    notes: {
      income: incomeSourcesText(monthTransactions, world.categories),
      saved: savedTargetsText(monthTransactions, world.savings),
      left: isCurrentMonth ? `Van ${day} ${day === 1 ? 'día' : 'días'}; quedan ${daysInMonth(ctx.today) - day}` : 'Mes cerrado',
    },
    bars: monthBars(monthWindow(current), world.transactions, month),
    budget: rows.filter((row) => row.limitCents !== null).slice(0, 5),
    savings: world.savings.map((goal) => savingView(goal, world.transactions, ctx.today)).slice(0, 2),
    debts: world.debts
      .map(debtView)
      .filter((debt) => debt.leftCents > 0)
      .slice(0, 2),
    charges,
    moves: monthTransactions.slice(0, 5),
    shares: categoryShares(rows),
    lookup: { categories: world.categories, cards: allCards(world) },
  }
}

// Movimientos: los de un mes y lo que hace falta para escribir uno nuevo.
export async function getMovements(raw?: string): Promise<MovementsView> {
  const { world, ctx } = await loadFinance()
  const month = clampMonth(raw, ctx.today)
  return {
    month,
    transactions: transactionsOfMonth(world.transactions, month),
    lookup: { categories: world.categories, cards: allCards(world) },
    cards: world.cards,
    savings: world.savings,
    debts: world.debts.map(debtView),
  }
}

// Ahorros y deudas, con su avance.
export async function getSavingsDebts(): Promise<SavingsDebtsView> {
  const { world, ctx } = await loadFinance()
  const savings = world.savings.map((goal) => savingView(goal, world.transactions, ctx.today))
  const debts = world.debts.map(debtView)
  return {
    savings,
    debts,
    savedTotalCents: savings.reduce((sum, goal) => sum + goal.savedCents, 0),
    debtLeftCents: debts.reduce((sum, debt) => sum + debt.leftCents, 0),
  }
}

// Membresías y tarjetas: cada tarjeta con cuántas membresías activas paga y cuánto suman al mes.
export async function getMemberships(): Promise<MembershipsView> {
  const [{ cards: liveCards, memberships: records }, ctx] = await Promise.all([loadMemberships(), getMockContext()])
  const memberships = records
    .map((record) => toMembership(record, liveCards, ctx.today))
    .sort((a, b) => (a.status === b.status ? a.nextChargeOn.localeCompare(b.nextChargeOn) : a.status === 'active' ? -1 : 1))

  const active = records.filter((record) => record.status === 'active')
  const cards: CardView[] = liveCards.map((card) => {
    const mine = active.filter((record) => record.cardId === card.id)
    return { ...card, membershipCount: mine.length, monthlyCents: mine.reduce((sum, record) => sum + monthlyEquivalentCents(record), 0) }
  })

  return {
    cards,
    memberships,
    monthlyCents: active.reduce((sum, record) => sum + monthlyEquivalentCents(record), 0),
    activeCount: active.length,
  }
}

// Presupuesto del mes en curso: el límite de cada categoría contra lo que va gastado.
export async function getBudget(): Promise<BudgetView> {
  const { world, ctx } = await loadFinance()
  const rows = budgetRows(world.categories, transactionsOfMonth(world.transactions, monthOf(ctx.today)))
  const { spentCents, plannedCents } = budgetTotals(rows)
  return {
    month: monthOf(ctx.today),
    rows,
    spentCents,
    plannedCents,
    progressText: budgetProgressText(spentCents, plannedCents, ctx.today),
    alerts: world.budgetAlerts,
    lookup: { categories: world.categories, cards: allCards(world) },
  }
}
