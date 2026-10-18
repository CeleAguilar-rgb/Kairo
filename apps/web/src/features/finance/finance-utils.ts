import { FALLBACK_CATEGORY_ID, FINANCE_MONTHS_BACK } from '@kairo/shared'

import { addDays, addMonths, dayOfMonth, daysInMonth, formatMonthShort, weekdayOf, type IsoDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

import { CARD_KIND_LABEL, type BudgetRow, type BudgetState, type Category, type CategoryShare, type Debt, type DebtView, type FinanceLookup, type Membership, type MembershipRecord, type MonthBar, type MonthKey, type MonthTotals, type PaymentCard, type SavingGoal, type SavingView, type ShareTone, type Transaction } from './types'
import { DEBT_KIND_LABEL, INCOMING_KINDS, MONTH_NAMES, WEEKDAY_NAMES } from './finance-meta'

// La lógica pura de Finanzas: meses, totales, presupuesto, progreso de ahorros y deudas, cobros de
// membresías y los textos de cada movimiento. Sin servidor ni React, para poder probarla suelta.

// --- Meses ----------------------------------------------------------------------------------------

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export const monthOf = (date: IsoDate): MonthKey => date.slice(0, 7)

export const monthStartOf = (month: MonthKey): IsoDate => `${month}-01`

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  return addMonths(monthStartOf(month), delta).slice(0, 7)
}

// El mes de la dirección (`?mes=2026-10`), recortado a los que se pueden ver: el actual y 5 hacia atrás. Lo
// que no sea un mes, o caiga fuera, es el mes actual.
export function clampMonth(raw: string | undefined, today: IsoDate): MonthKey {
  const current = monthOf(today)
  if (!raw || !MONTH_PATTERN.test(raw)) return current
  if (raw > current || raw < shiftMonth(current, -FINANCE_MONTHS_BACK)) return current
  return raw
}

// Los seis meses de la gráfica, del más viejo al actual.
export function monthWindow(current: MonthKey): MonthKey[] {
  return Array.from({ length: FINANCE_MONTHS_BACK + 1 }, (_, index) => shiftMonth(current, index - FINANCE_MONTHS_BACK))
}

// Las flechas de mes de una pestaña: el mes actual no lleva `?mes=` (así es la dirección de siempre), y null
// en una flecha es que ya no se puede ir más lejos (más allá del mes actual o de los 6 que se guardan).
export function monthHrefs(base: string, month: MonthKey, current: MonthKey, oldest: MonthKey) {
  const href = (target: MonthKey) => (target === current ? base : `${base}?mes=${target}`)
  return {
    prevHref: month > oldest ? href(shiftMonth(month, -1)) : null,
    nextHref: month < current ? href(shiftMonth(month, 1)) : null,
  }
}

const monthIndex = (month: MonthKey) => Number(month.slice(5, 7)) - 1

// "Octubre 2026"
export const monthTitle = (month: MonthKey) => `${MONTH_NAMES[monthIndex(month)]} ${month.slice(0, 4)}`

// "octubre"
export const monthWord = (month: MonthKey) => MONTH_NAMES[monthIndex(month)].toLowerCase()

// "Oct"
export function monthShortLabel(month: MonthKey) {
  const short = formatMonthShort(monthStartOf(month))
  return short.charAt(0).toUpperCase() + short.slice(1)
}

// --- Dinero que se escribe ---------------------------------------------------------------------------

// "250", "$1,250.50", "1 250" → centavos. null si no es un monto. Las cuentas nunca usan decimales sueltos:
// se convierte a centavos enteros aquí, en el borde.
export function parseMoneyInput(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

// El inverso, para volver a escribir un monto al editar: 125000 → "1250", 125050 → "1250.50".
export function moneyInputText(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

// "12", "12%", "12.5" → 12 / 12.5. null si está vacío o no es un número.
export function parsePercentInput(text: string): number | null {
  const cleaned = text.replace(/[%\s]/g, '')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned)
}

// "5" → 5. null si está vacío o no es un entero.
export function parseWholeInput(text: string): number | null {
  const cleaned = text.trim()
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null
}

// --- Totales de un mes ----------------------------------------------------------------------------

export function totalsOf(transactions: Transaction[]): MonthTotals {
  let incomeCents = 0
  let expenseCents = 0
  let savedCents = 0
  let debtPaidCents = 0
  for (const transaction of transactions) {
    if (transaction.kind === 'income') incomeCents += transaction.amountCents
    else if (transaction.kind === 'expense') expenseCents += transaction.amountCents
    else if (transaction.kind === 'saving_deposit') savedCents += transaction.amountCents
    else if (transaction.kind === 'saving_withdrawal') savedCents -= transaction.amountCents
    else debtPaidCents += transaction.amountCents
  }
  return { incomeCents, expenseCents, savedCents, debtPaidCents, leftCents: incomeCents - expenseCents - savedCents - debtPaidCents }
}

export const transactionsOfMonth = (transactions: Transaction[], month: MonthKey) => transactions.filter((item) => item.occurredOn.startsWith(month))

// --- Presupuesto ----------------------------------------------------------------------------------

// Sin límite no hay estado; a partir del 80% avisa ("warn"); pasarse es "over".
export function budgetState(spentCents: number, limitCents: number | null): BudgetState {
  if (limitCents === null) return 'none'
  if (spentCents > limitCents) return 'over'
  if (spentCents * 5 >= limitCents * 4) return 'warn'
  return 'ok'
}

export function spentByCategory(transactions: Transaction[]): Map<string, number> {
  const spent = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.kind !== 'expense' || !transaction.categoryId) continue
    spent.set(transaction.categoryId, (spent.get(transaction.categoryId) ?? 0) + transaction.amountCents)
  }
  return spent
}

// Una fila por categoría de gasto, en el orden de la lista, con lo gastado en esos movimientos.
export function budgetRows(categories: Category[], transactions: Transaction[]): BudgetRow[] {
  const spent = spentByCategory(transactions)
  return categories
    .filter((category) => category.kind === 'expense')
    .map((category) => {
      const spentCents = spent.get(category.id) ?? 0
      return { category, spentCents, limitCents: category.limitCents, state: budgetState(spentCents, category.limitCents) }
    })
}

// 0 a 1, para el largo de la barra (pasarse no desborda).
export const budgetRatio = (spentCents: number, limitCents: number | null) => (limitCents && limitCents > 0 ? Math.min(1, spentCents / limitCents) : 0)

// Lo que dice el Resumen: "$1,680 de $1,500 · te pasaste".
export function budgetSummaryText(row: BudgetRow): string {
  if (row.limitCents === null) return formatMoney(row.spentCents)
  return `${formatMoney(row.spentCents)} de ${formatMoney(row.limitCents)}${row.state === 'over' ? ' · te pasaste' : ''}`
}

// Lo que dice la fila del Presupuesto: "$2,600 · quedan $1,400", "Te pasaste $180", "Sin límite · $0".
export function budgetRowText(row: BudgetRow): string {
  if (row.limitCents === null) return `Sin límite · ${formatMoney(row.spentCents)}`
  if (row.state === 'over') return `Te pasaste ${formatMoney(row.spentCents - row.limitCents)}`
  return `${formatMoney(row.spentCents)} · quedan ${formatMoney(row.limitCents - row.spentCents)}`
}

// Lo planeado y lo gastado solo cuentan las categorías que tienen límite.
export function budgetTotals(rows: BudgetRow[]) {
  let spentCents = 0
  let plannedCents = 0
  for (const row of rows) {
    if (row.limitCents === null) continue
    spentCents += row.spentCents
    plannedCents += row.limitCents
  }
  return { spentCents, plannedCents }
}

// "Van 16 de 31 días · gastaste el 33% de lo planeado"
export function budgetProgressText(spentCents: number, plannedCents: number, today: IsoDate): string {
  const percent = Math.round((spentCents / Math.max(1, plannedCents)) * 100)
  return `Van ${dayOfMonth(today)} de ${daysInMonth(today)} días · gastaste el ${percent}% de lo planeado`
}

// "¿En qué se fue?": las cuatro categorías que más pesan y, juntas, el resto.
const SHARE_TONES: ShareTone[] = ['ink', 'strong', 'accent', 'rose', 'sand']

export function categoryShares(rows: BudgetRow[]): CategoryShare[] {
  const sorted = rows.filter((row) => row.spentCents > 0).sort((a, b) => b.spentCents - a.spentCents)
  const total = sorted.reduce((sum, row) => sum + row.spentCents, 0)
  if (total === 0) return []
  const percentOf = (cents: number) => Math.round((cents / total) * 100)

  const shares: CategoryShare[] = sorted.slice(0, 4).map((row, index) => ({
    id: row.category.id,
    name: row.category.name,
    tone: SHARE_TONES[index],
    spentCents: row.spentCents,
    percent: percentOf(row.spentCents),
  }))
  const rest = sorted.slice(4)
  if (rest.length > 0) {
    const spentCents = rest.reduce((sum, row) => sum + row.spentCents, 0)
    const names = rest.map((row) => row.category.name)
    shares.push({
      id: 'rest',
      name: names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} y ${names[1].toLowerCase()}` : 'Otras categorías',
      tone: 'sand',
      spentCents,
      percent: percentOf(spentCents),
    })
  }
  return shares
}

// --- Gráfica de 6 meses ---------------------------------------------------------------------------

export function monthBars(window: MonthKey[], transactions: Transaction[], selected: MonthKey): MonthBar[] {
  return window.map((month) => {
    const totals = totalsOf(transactionsOfMonth(transactions, month))
    return { month, label: monthShortLabel(month), incomeCents: totals.incomeCents, expenseCents: totals.expenseCents, leftCents: totals.leftCents, selected: month === selected }
  })
}

// El tope de la gráfica: el mayor valor, redondeado hacia arriba a múltiplos de $5,000.
export function chartMax(bars: MonthBar[]): number {
  const biggest = Math.max(0, ...bars.flatMap((bar) => [bar.incomeCents, bar.expenseCents]))
  return Math.max(500_000, Math.ceil(biggest / 500_000) * 500_000)
}

// "+9.3k", "−0.6k": lo que te quedó, arriba de cada mes.
export function netLabel(cents: number): string {
  const thousands = Math.round(Math.abs(cents) / 100 / 100) / 10
  return `${cents < 0 ? '−' : '+'}${thousands}k`
}

export function chartAriaLabel(bars: MonthBar[]): string {
  const first = monthWord(bars[0].month)
  const last = monthWord(bars[bars.length - 1].month)
  const always = bars.every((bar) => bar.incomeCents >= bar.expenseCents)
  return `Ingresos y gastos de ${first} a ${last}; ${always ? 'en todos los meses entró más de lo que salió.' : 'hay meses en que salió más de lo que entró.'}`
}

// --- Ahorros y deudas -----------------------------------------------------------------------------

export function savedOf(savingId: string, transactions: Transaction[]): number {
  let saved = 0
  for (const transaction of transactions) {
    if (transaction.savingId !== savingId) continue
    if (transaction.kind === 'saving_deposit') saved += transaction.amountCents
    else if (transaction.kind === 'saving_withdrawal') saved -= transaction.amountCents
  }
  return Math.max(0, saved)
}

export function paidOf(debtId: string, transactions: Transaction[]): number {
  let paid = 0
  for (const transaction of transactions) {
    if (transaction.debtId === debtId && transaction.kind === 'debt_payment') paid += transaction.amountCents
  }
  return paid
}

// Meses que hay de un día a otro, contados por mes de calendario (de octubre a marzo son 5). Mínimo 1.
export function monthsUntil(from: IsoDate, to: IsoDate): number {
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7)))
  return Math.max(1, months)
}

// "Aparta $760 al mes para llegar" (con fecha meta) o "A tu ritmo actual: unos 2 años" (sin ella). El
// ritmo es lo que se apartó en los últimos 6 meses, entre 6.
export function savingTip(goal: SavingGoal, savedCents: number, transactions: Transaction[], today: IsoDate): string {
  const remaining = goal.targetCents - savedCents
  if (remaining <= 0) return '¡Meta alcanzada!'

  if (goal.dueOn) {
    const perMonth = Math.ceil(remaining / monthsUntil(today, goal.dueOn) / 100) * 100
    return `Aparta ${formatMoney(perMonth)} al mes para llegar`
  }

  const since = monthStartOf(shiftMonth(monthOf(today), -FINANCE_MONTHS_BACK))
  let recent = 0
  for (const transaction of transactions) {
    if (transaction.savingId !== goal.id || transaction.occurredOn < since) continue
    if (transaction.kind === 'saving_deposit') recent += transaction.amountCents
    else if (transaction.kind === 'saving_withdrawal') recent -= transaction.amountCents
  }
  const perMonth = recent / (FINANCE_MONTHS_BACK + 1)
  if (perMonth <= 0) return 'Aporta algo para calcular cuándo llegas'
  const months = Math.ceil(remaining / perMonth)
  if (months > 120) return 'A tu ritmo actual: más de 10 años'
  if (months <= 18) return `A tu ritmo actual: unos ${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.round(months / 12)
  return `A tu ritmo actual: unos ${years} ${years === 1 ? 'año' : 'años'}`
}

// "Meta: marzo 2027" o "Sin fecha meta".
export function savingDueText(dueOn: IsoDate | null): string {
  if (!dueOn) return 'Sin fecha meta'
  return `Meta: ${monthWord(monthOf(dueOn))} ${dueOn.slice(0, 4)}`
}

export function savingView(goal: SavingGoal, transactions: Transaction[], today: IsoDate): SavingView {
  const savedCents = savedOf(goal.id, transactions)
  return { ...goal, savedCents, dueText: savingDueText(goal.dueOn), tip: savingTip(goal, savedCents, transactions, today) }
}

export function debtView(debt: Debt, transactions: Transaction[]): DebtView {
  const paidCents = Math.min(debt.totalCents, paidOf(debt.id, transactions))
  const leftCents = debt.totalCents - paidCents

  let paidOffOn: IsoDate | null = null
  if (leftCents <= 0) {
    for (const transaction of transactions) {
      if (transaction.debtId === debt.id && transaction.kind === 'debt_payment' && (paidOffOn === null || transaction.occurredOn > paidOffOn)) paidOffOn = transaction.occurredOn
    }
  }

  const second = debt.monthlyPaymentCents
    ? debt.kind === 'card'
      ? `Pago mínimo ${formatMoney(debt.monthlyPaymentCents)}`
      : `Pago ${formatMoney(debt.monthlyPaymentCents)}/mes`
    : debt.annualInterestPct && debt.annualInterestPct > 0
      ? `${debt.annualInterestPct}% anual`
      : 'Sin intereses'

  return {
    ...debt,
    paidCents,
    leftCents,
    paidOffOn,
    chips: [DEBT_KIND_LABEL[debt.kind], second],
    nextText: debt.nextPaymentOn ? `próximo pago ${dayOfMonth(debt.nextPaymentOn)} ${formatMonthShort(debt.nextPaymentOn)}` : 'sin fecha fija',
  }
}

// "$6,200 de $10,000 · meta en marzo" (la línea de un ahorro en el Resumen).
export function savingSummaryText(goal: SavingView): string {
  const due = goal.dueOn ? `meta en ${monthWord(monthOf(goal.dueOn))}` : 'sin fecha'
  return `${formatMoney(goal.savedCents)} de ${formatMoney(goal.targetCents)} · ${due}`
}

// "Pagado $3,700 de $8,000 · próximo pago 20 oct" (la línea de una deuda en el Resumen; sin fecha de pago
// dice en qué condiciones está, por ejemplo "sin intereses").
export function debtSummaryText(debt: DebtView): string {
  const tail = debt.nextPaymentOn ? debt.nextText : debt.chips[1].toLowerCase()
  return `Pagado ${formatMoney(debt.paidCents)} de ${formatMoney(debt.totalCents)} · ${tail}`
}

// De dónde entró el dinero del mes: "Sueldo y trabajo extra".
export function incomeSourcesText(transactions: Transaction[], categories: Category[]): string {
  const totals = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.kind !== 'income' || !transaction.categoryId) continue
    totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amountCents)
  }
  const names = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => categories.find((category) => category.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  if (names.length === 0) return 'Sin ingresos este mes'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} y ${names[1].toLowerCase()}`
  return `${names[0]}, ${names[1].toLowerCase()} y más`
}

// A qué ahorro fue lo apartado del mes: "Fondo de emergencia" o "2 ahorros".
export function savedTargetsText(transactions: Transaction[], savings: SavingGoal[]): string {
  const ids = new Set<string>()
  for (const transaction of transactions) {
    if (transaction.kind === 'saving_deposit' && transaction.savingId) ids.add(transaction.savingId)
  }
  if (ids.size === 0) return 'Nada apartado este mes'
  if (ids.size === 1) return savings.find((goal) => goal.id === [...ids][0])?.name ?? '1 ahorro'
  return `${ids.size} ahorros`
}

// 0 a 1 de lo que ya se pagó o ahorró.
export const progressRatio = (doneCents: number, totalCents: number) => (totalCents > 0 ? Math.min(1, doneCents / totalCents) : 0)

// El primer día del mes que sigue (el "próximo pago" de una deuda con pago mensual recién creada).
export const firstOfNextMonth = (today: IsoDate): IsoDate => addMonths(`${today.slice(0, 7)}-01`, 1)

// --- Membresías y tarjetas ------------------------------------------------------------------------

function dateIn(year: number, month: number, day: number): IsoDate {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const last = daysInMonth(first)
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

type ChargeRule = Pick<MembershipRecord, 'cadence' | 'chargeDay' | 'chargeMonth' | 'chargeWeekday'>

// El próximo cobro a partir de hoy (hoy cuenta). No se guarda: se calcula con el día de cobro, así nunca
// queda en el pasado. Un cobro el día 31 cae el último día en los meses más cortos.
export function nextChargeOn(rule: ChargeRule, today: IsoDate): IsoDate {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))

  if (rule.cadence === 'weekly') {
    const weekday = rule.chargeWeekday ?? 0
    return addDays(today, (weekday - weekdayOf(today) + 7) % 7)
  }

  const day = rule.chargeDay ?? 1
  if (rule.cadence === 'yearly') {
    const chargeMonth = rule.chargeMonth ?? 1
    const thisYear = dateIn(year, chargeMonth, day)
    return thisYear >= today ? thisYear : dateIn(year + 1, chargeMonth, day)
  }

  const thisMonth = dateIn(year, month, day)
  if (thisMonth >= today) return thisMonth
  const next = shiftMonth(monthOf(today), 1)
  return dateIn(Number(next.slice(0, 4)), Number(next.slice(5, 7)), day)
}

// Lo que cuesta al mes, para el total ("$1,099 en membresías al mes"): lo anual se reparte entre 12 y lo
// semanal se multiplica por 52 y se reparte entre 12. Se redondea a pesos enteros, como en el canvas.
export function monthlyEquivalentCents(rule: Pick<MembershipRecord, 'amountCents' | 'cadence'>): number {
  if (rule.cadence === 'yearly') return Math.round(rule.amountCents / 12 / 100) * 100
  if (rule.cadence === 'weekly') return Math.round((rule.amountCents * 52) / 12 / 100) * 100
  return rule.amountCents
}

export function toMembership(record: MembershipRecord, cards: PaymentCard[], today: IsoDate): Membership {
  const next = nextChargeOn(record, today)
  return {
    id: record.id,
    name: record.name,
    amountCents: record.amountCents,
    currency: record.currency,
    cadence: record.cadence,
    chargeDay: record.chargeDay ?? dayOfMonth(next),
    chargeMonth: record.chargeMonth,
    chargeWeekday: record.chargeWeekday,
    nextChargeOn: next,
    card: cards.find((card) => card.id === record.cardId) ?? null,
    notify: record.notify,
    status: record.status,
  }
}

// "Débito ••4417", "Efectivo", "Sin tarjeta".
export function cardLabel(card: PaymentCard | null | undefined): string {
  if (!card) return 'Sin tarjeta'
  if (card.kind === 'cash' || !card.last4) return card.name
  return `${CARD_KIND_LABEL[card.kind]} ••${card.last4}`
}

// "••4417" o "Efectivo": para las tablas, donde el tipo ya se sabe.
export function cardShort(card: PaymentCard | null | undefined): string {
  if (!card) return '—'
  return card.kind === 'cash' || !card.last4 ? 'Efectivo' : `••${card.last4}`
}

// El renglón de la tarjeta en "Tarjetas y cuentas": "Débito", "Crédito · corte día 5", "Cuenta de efectivo".
export function cardKindText(card: PaymentCard): string {
  if (card.kind === 'cash') return 'Cuenta de efectivo'
  if (card.kind === 'credit' && card.cutDay) return `Crédito · corte día ${card.cutDay}`
  return CARD_KIND_LABEL[card.kind]
}

// --- Cómo se cuenta un movimiento -----------------------------------------------------------------

export const isIncoming = (transaction: Transaction) => INCOMING_KINDS.includes(transaction.kind)

export function categoryOf(transaction: Transaction, categories: Category[]): Category | null {
  return categories.find((category) => category.id === transaction.categoryId) ?? null
}

// El nombre del movimiento: lo que se escribió o, si se dejó vacío, su categoría.
export function movementTitle(transaction: Transaction, lookup: FinanceLookup): string {
  if (transaction.concept) return transaction.concept
  const category = categoryOf(transaction, lookup.categories)
  if (category) return category.name
  if (transaction.kind === 'saving_deposit') return 'Ahorro'
  if (transaction.kind === 'saving_withdrawal') return 'Retiro de ahorro'
  return 'Pago de deuda'
}

// "hoy", "ayer", "lun 5"
export function shortDay(date: IsoDate, today: IsoDate): string {
  if (date === today) return 'hoy'
  if (date === addDays(today, -1)) return 'ayer'
  return `${WEEKDAY_NAMES[weekdayOf(date)].slice(0, 3).toLowerCase()} ${dayOfMonth(date)}`
}

// "Comida fuera · Débito ••4417" (y, si se pide, "· hoy").
export function movementSub(transaction: Transaction, lookup: FinanceLookup, today?: IsoDate): string {
  const category = categoryOf(transaction, lookup.categories)
  const label =
    category?.name ??
    (transaction.kind === 'saving_deposit' ? 'Ahorro' : transaction.kind === 'saving_withdrawal' ? 'Retiro de ahorro' : 'Deuda')
  const card = lookup.cards.find((item) => item.id === transaction.cardId)
  const parts = [label]
  if (card) parts.push(transaction.kind === 'debt_payment' ? `desde ${cardLabel(card)}` : cardLabel(card))
  if (today) parts.push(shortDay(transaction.occurredOn, today))
  return parts.join(' · ')
}

// "+$17,000" o "−$320"
export function movementAmountText(transaction: Transaction): string {
  return formatMoney(isIncoming(transaction) ? transaction.amountCents : -transaction.amountCents, transaction.currency, { sign: true })
}

// "Hoy, jueves 8" o "Miércoles 7"
export function dayGroupLabel(date: IsoDate, today: IsoDate): string {
  const weekday = WEEKDAY_NAMES[weekdayOf(date)]
  if (date === today) return `Hoy, ${weekday.toLowerCase()} ${dayOfMonth(date)}`
  return `${weekday} ${dayOfMonth(date)}`
}

export type MovementGroup = { date: IsoDate; label: string; rows: Transaction[] }

// Los movimientos agrupados por día, del más reciente al más viejo. `transactions` ya viene con lo más
// nuevo primero; dentro de un día se respeta ese orden.
export function groupByDay(transactions: Transaction[], today: IsoDate): MovementGroup[] {
  const sorted = [...transactions].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
  const groups: MovementGroup[] = []
  for (const transaction of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === transaction.occurredOn) last.rows.push(transaction)
    else groups.push({ date: transaction.occurredOn, label: dayGroupLabel(transaction.occurredOn, today), rows: [transaction] })
  }
  return groups
}

export type MovementFilter = 'all' | 'income' | 'expense' | 'saving_debt'

export function matchesFilter(transaction: Transaction, filter: MovementFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'income') return transaction.kind === 'income'
  if (filter === 'expense') return transaction.kind === 'expense'
  return transaction.kind === 'saving_deposit' || transaction.kind === 'saving_withdrawal' || transaction.kind === 'debt_payment'
}

// Lo que entró y lo que salió en una lista de movimientos (lo apartado a ahorros y lo pagado de deudas
// cuentan como lo que salió de tu bolsillo).
export function inOutTotals(transactions: Transaction[]) {
  let inCents = 0
  let outCents = 0
  for (const transaction of transactions) {
    if (isIncoming(transaction)) inCents += transaction.amountCents
    else outCents += transaction.amountCents
  }
  return { inCents, outCents }
}

// La categoría con la que arranca el formulario de un movimiento nuevo.
export function defaultCategoryId(kind: 'expense' | 'income', categories: Category[]): string | null {
  const ofKind = categories.filter((category) => category.kind === kind)
  const preferred = ofKind.find((category) => category.id === (kind === 'income' ? 'salary' : 'dining'))
  return (preferred ?? ofKind[0])?.id ?? null
}

// Al borrar una categoría, sus gastos se pasan a "Otros".
export const isFallbackCategory = (categoryId: string) => categoryId === FALLBACK_CATEGORY_ID
