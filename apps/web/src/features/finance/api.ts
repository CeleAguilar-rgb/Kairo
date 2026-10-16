import 'server-only'

import { FINANCE_MONTHS_BACK } from '@kairo/shared'

import { dayOfMonth, daysInMonth, type IsoDate } from '@/lib/dates'
import { mockDelay } from '@/lib/mock/context'

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
  monthWindow,
  monthlyEquivalentCents,
  savedTargetsText,
  savingView,
  shiftMonth,
  toMembership,
  totalsOf,
  transactionsOfMonth,
} from './finance-utils'
import { allCards, loadFinance } from './mock-store'
import type {
  BudgetView,
  CardView,
  ChargeRow,
  FinanceSummary,
  Membership,
  MembershipsView,
  MonthKey,
  MovementsView,
  SavingsDebtsView,
} from './types'

// Las lecturas de Finanzas. Cada una devuelve lo que necesita una pestaña ya armado (totales, filas, textos de
// avance) a partir de los movimientos: con la API serán consultas con SUM y GROUP BY, y la pantalla recibe la
// misma forma de datos (`api.get('/finance/summary?month=2026-10')`).

// El mes que se está viendo (el de la dirección, recortado) y los límites para las flechas.
export async function getFinanceMonth(raw?: string): Promise<{ month: MonthKey; current: MonthKey; oldest: MonthKey; today: IsoDate }> {
  const { ctx } = await loadFinance()
  const current = monthOf(ctx.today)
  return { month: clampMonth(raw, ctx.today), current, oldest: shiftMonth(current, -FINANCE_MONTHS_BACK), today: ctx.today }
}

// Los cobros que vienen, del más próximo al más lejano, solo de las membresías activas. Los leen Inicio
// ("Próximos pagos"), la Agenda y la pestaña Membresías. Con la API: `api.get('/finance/memberships/upcoming')`.
export async function listUpcomingPayments(): Promise<Membership[]> {
  const { world, ctx } = await loadFinance()
  await mockDelay()
  return world.memberships
    .filter((record) => record.status === 'active')
    .map((record) => toMembership(record, world.cards, ctx.today))
    .sort((a, b) => a.nextChargeOn.localeCompare(b.nextChargeOn))
}

// Resumen: las cifras del mes, la gráfica de 6 meses y un vistazo de presupuesto, ahorros, deudas, cobros y
// movimientos.
export async function getFinanceSummary(raw?: string): Promise<FinanceSummary> {
  const { world, ctx } = await loadFinance()
  await mockDelay()
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
      .map((debt) => debtView(debt, world.transactions))
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
  await mockDelay()
  const month = clampMonth(raw, ctx.today)
  return {
    month,
    transactions: transactionsOfMonth(world.transactions, month),
    lookup: { categories: world.categories, cards: allCards(world) },
    cards: world.cards,
    savings: world.savings,
    debts: world.debts.map((debt) => debtView(debt, world.transactions)),
  }
}

// Ahorros y deudas, con su avance calculado de los movimientos.
export async function getSavingsDebts(): Promise<SavingsDebtsView> {
  const { world, ctx } = await loadFinance()
  await mockDelay()
  const savings = world.savings.map((goal) => savingView(goal, world.transactions, ctx.today))
  const debts = world.debts.map((debt) => debtView(debt, world.transactions))
  return {
    savings,
    debts,
    savedTotalCents: savings.reduce((sum, goal) => sum + goal.savedCents, 0),
    debtLeftCents: debts.reduce((sum, debt) => sum + debt.leftCents, 0),
  }
}

// Membresías y tarjetas: cada tarjeta con cuántas membresías activas paga y cuánto suman al mes.
export async function getMemberships(): Promise<MembershipsView> {
  const { world, ctx } = await loadFinance()
  await mockDelay()
  const memberships = world.memberships
    .map((record) => toMembership(record, world.cards, ctx.today))
    .sort((a, b) => (a.status === b.status ? a.nextChargeOn.localeCompare(b.nextChargeOn) : a.status === 'active' ? -1 : 1))

  const active = world.memberships.filter((record) => record.status === 'active')
  const cards: CardView[] = world.cards.map((card) => {
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
  await mockDelay()
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

// Las tarjetas vivas, para los formularios (membresía nueva, movimiento).
export async function listCards() {
  const { world } = await loadFinance()
  return world.cards
}
